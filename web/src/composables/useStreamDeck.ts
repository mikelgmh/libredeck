import { ref, computed, nextTick } from 'vue'
import type { ActionType, ButtonData, ProfileData, PageData, ButtonEntity } from '../types/streamdeck'

export function useStreamDeck() {
  // Connection State
  const connectionStatus = ref('bg-error')
  const connectionText = ref('Desconectado')
  
  // Data State
  const profiles = ref<ProfileData[]>([])
  const selectedProfile = ref('')
  const currentProfile = ref<ProfileData | null>(null)
  const currentPage = ref<PageData | null>(null)
  const currentButtons = ref<ButtonEntity[]>([])
  const plugins = ref<any[]>([])
  
  // Grid State
  const gridCols = ref(5)
  const gridRows = ref(3)
  const selectedButton = ref<number | null>(null)
  const executingButtons = ref<number[]>([])
  
  // Button Config
  const buttonConfig = ref<ButtonData>({
    label: '',
    emoji: '',
    backgroundColor: '#374151',
    textColor: '#f1f5f9',
    actions: []
  })
  
  // WebSocket
  let ws: WebSocket | null = null
  const API_BASE = 'http://localhost:3001/api/v1'
  const WS_URL = 'ws://localhost:3002'
  
  // Storage keys
  const STORAGE_KEYS = {
    SELECTED_PROFILE: 'libredeck_selected_profile'
  }
  
  // Auto-save state
  const saveTimeout = ref<NodeJS.Timeout | null>(null)
  const isChangingButton = ref(false)
  const isSaving = ref(false)
  const isSwapping = ref(false)
  
  // Computed properties
  const getButtonData = computed(() => (position: number) => {
    const button = getButton(position)
    // If this is the selected button, always use current config for real-time updates
    if (selectedButton.value === position) {
      return {
        ...buttonConfig.value,
        // Force reactivity by accessing reactive values
        _forceUpdate: selectedButton.value
      }
    }
    // Otherwise return saved data or empty object
    return button?.data || {
      label: '',
      emoji: '',
      backgroundColor: '#374151',
      textColor: '#f1f5f9',
      actions: []
    }
  })
  
  const getButtonStyle = computed(() => (position: number) => {
    const data = getButtonData.value(position)
    if (!data) return {}
    
    return {
      backgroundColor: data.backgroundColor || '#374151',
      color: data.textColor || '#f1f5f9'
    }
  })
  
  // Utility functions
  const saveSelectedProfile = (profileId: string) => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PROFILE, profileId)
  }
  
  const getSelectedProfile = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_PROFILE)
  }
  
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    
    return response.json()
  }
  
  // WebSocket functions
  const connectWebSocket = () => {
    try {
      ws = new WebSocket(WS_URL)
      
      ws.onopen = () => {
        connectionStatus.value = 'bg-success'
        connectionText.value = 'Conectado'
        
        ws?.send(JSON.stringify({
          type: 'subscribe',
          payload: { topics: ['profiles', 'buttons', 'actions', 'plugins'] }
        }))
      }
      
      ws.onclose = () => {
        connectionStatus.value = 'bg-error'
        connectionText.value = 'Desconectado'
        setTimeout(connectWebSocket, 3000)
      }
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Invalid WebSocket message:', error)
        }
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }
  
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'profile.updated':
        loadProfiles()
        break
      case 'button.created':
        if (currentPage.value && !isSwapping.value) {
          console.log('🔌 Button created via WebSocket, reloading...')
          loadButtons()
        }
        break
      case 'button.updated':
        if (currentPage.value && !isSwapping.value) {
          console.log('🔌 Button updated via WebSocket, checking if should reload...')
          // Only reload if not currently swapping
          loadButtons()
        } else if (isSwapping.value) {
          console.log('🚫 Ignoring WebSocket button update during swap')
        }
        break
      case 'button.deleted':
        if (currentPage.value && !isSwapping.value) {
          loadButtons()
        }
        break
      case 'action.finished':
        // Remove executing state after action completes
        break
    }
  }
  
  // Data loading functions
  const createDefaultProfile = async () => {
    try {
      const defaultProfile = await apiRequest('/profiles', {
        method: 'POST',
        body: JSON.stringify({ 
          name: 'Perfil Principal',
          data: { isDefault: true } 
        })
      })
      
      // Create default page
      await apiRequest('/pages', {
        method: 'POST',
        body: JSON.stringify({
          profile_id: defaultProfile.id,
          name: 'Página Principal',
          order_idx: 0,
          data: {}
        })
      })
      
      return defaultProfile
    } catch (error) {
      console.error('Failed to create default profile:', error)
      return null
    }
  }
  
  const loadProfiles = async () => {
    try {
      profiles.value = await apiRequest('/profiles')
      
      // Create default profile if no profiles exist
      if (profiles.value.length === 0) {
        console.log('No profiles found, creating default profile...')
        const defaultProfile = await createDefaultProfile()
        if (defaultProfile) {
          profiles.value = [defaultProfile]
        }
      }
      
      // Try to restore saved profile first
      const savedProfileId = getSelectedProfile()
      if (savedProfileId && profiles.value.find(p => p.id === savedProfileId)) {
        selectedProfile.value = savedProfileId
      } else if (profiles.value.length > 0) {
        // Fallback to first profile if no saved profile or saved profile doesn't exist
        selectedProfile.value = profiles.value[0].id
        saveSelectedProfile(profiles.value[0].id)
      }
      
      // Load the selected profile
      if (selectedProfile.value) {
        await loadProfile()
      }
    } catch (error) {
      console.error('Failed to load profiles:', error)
    }
  }
  
  const loadProfile = async () => {
    if (!selectedProfile.value) {
      currentProfile.value = null
      currentPage.value = null
      currentButtons.value = []
      selectedButton.value = null
      return
    }
    
    // Save selected profile to localStorage
    saveSelectedProfile(selectedProfile.value)
    
    try {
      currentProfile.value = await apiRequest(`/profiles/${selectedProfile.value}`)
      
      const pages = await apiRequest(`/pages?profileId=${selectedProfile.value}`)
      if (pages.length > 0) {
        currentPage.value = pages[0]
        await loadButtons()
      } else {
        // Create default page
        currentPage.value = await apiRequest('/pages', {
          method: 'POST',
          body: JSON.stringify({
            profile_id: selectedProfile.value,
            name: 'Página Principal',
            order_idx: 0,
            data: { gridCols: gridCols.value, gridRows: gridRows.value }
          })
        })
        currentButtons.value = []
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }
  
  const loadButtons = async () => {
    if (!currentPage.value) return
    
    try {
      const buttons = await apiRequest(`/buttons?pageId=${currentPage.value.id}`)
      console.log('📥 Loaded buttons from API:', buttons)
      console.log('📍 Button positions:', buttons.map((b: any) => ({ id: b.id, position: b.position, label: b.data?.label })))
      currentButtons.value = buttons
    } catch (error) {
      console.error('Failed to load buttons:', error)
    }
  }
  
  // Button management functions
  const getButton = (position: number): ButtonEntity | undefined => {
    return currentButtons.value.find((btn) => btn.position === position)
  }
  
  const selectButton = async (position: number) => {
    // Save current button before switching (only if there were actual changes)
    if (selectedButton.value !== null && selectedButton.value !== position) {
      const currentButton = getButton(selectedButton.value)
      if (currentButton) {
        // Only save if the button exists and has changes
        const hasChanges = JSON.stringify(currentButton.data) !== JSON.stringify(buttonConfig.value)
        if (hasChanges) {
          await saveButtonConfig()
        }
      } else {
        // For new buttons, only save if there's actual content
        const hasContent = buttonConfig.value.label.trim() || buttonConfig.value.emoji.trim() || buttonConfig.value.actions.length > 0
        if (hasContent) {
          await saveButtonConfig()
        }
      }
    }
    
    selectedButton.value = position
    const button = getButton(position)
    console.log('Selected button at position:', position, 'Found button:', button)
    
    if (button) {
      buttonConfig.value = {
        label: button.data?.label || '',
        emoji: button.data?.emoji || '',
        backgroundColor: button.data?.backgroundColor || '#374151',
        textColor: button.data?.textColor || '#f1f5f9',
        actions: button.data?.actions ? JSON.parse(JSON.stringify(button.data.actions)) : []
      }
    } else {
      buttonConfig.value = {
        label: '',
        emoji: '',
        backgroundColor: '#374151',
        textColor: '#f1f5f9',
        actions: []
      }
    }
  }
  
  const executeButton = async (position: number) => {
    const button = getButton(position)
    if (!button?.data?.actions?.length) return
    
    executingButtons.value.push(position)
    
    try {
      for (const action of button.data.actions) {
        await apiRequest('/actions/execute', {
          method: 'POST',
          body: JSON.stringify({
            action,
            context: {
              buttonId: button.id,
              pageId: button.page_id,
              profileId: currentProfile.value?.id,
              position
            }
          })
        })
      }
    } catch (error) {
      console.error('Failed to execute button:', error)
    } finally {
      setTimeout(() => {
        const index = executingButtons.value.indexOf(position)
        if (index > -1) executingButtons.value.splice(index, 1)
      }, 500)
    }
  }
  
  // Button configuration functions
  const saveButtonConfig = async () => {
    if (selectedButton.value === null || !currentPage.value) return
    
    const position = selectedButton.value
    const existingButton = getButton(position)
    
    // Only save if there's actual content to save
    const hasContent = buttonConfig.value.label.trim() || 
                      buttonConfig.value.emoji.trim() || 
                      buttonConfig.value.actions.length > 0
    
    try {
      if (existingButton) {
        if (hasContent) {
          // Update existing button
          await apiRequest(`/buttons/${existingButton.id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: buttonConfig.value })
          })
          
          // Update local data
          existingButton.data = { ...buttonConfig.value }
          
          // Force reactivity update
          await nextTick()
        } else {
          // Delete button if no content
          await apiRequest(`/buttons/${existingButton.id}`, {
            method: 'DELETE'
          })
          
          // Remove from local data
          const index = currentButtons.value.findIndex(b => b.id === existingButton.id)
          if (index > -1) {
            currentButtons.value.splice(index, 1)
          }
        }
      } else if (hasContent) {
        // Create new button only if there's content
        const newButton = await apiRequest('/buttons', {
          method: 'POST',
          body: JSON.stringify({
            page_id: currentPage.value.id,
            position,
            data: buttonConfig.value
          })
        })
        
        currentButtons.value.push(newButton)
        console.log('Button created:', newButton.id, 'Data:', newButton)
      } else {
        // No content and no existing button - nothing to do
        console.log('No content to save for empty button at position:', position)
      }
    } catch (error) {
      console.error('Failed to save button:', error)
    } finally {
      isSaving.value = false
    }
  }
  
  // Action management functions
  const addAction = (type: string) => {
    const newAction = {
      id: Date.now().toString(),
      type,
      parameters: getDefaultActionParameters(type)
    }
    
    buttonConfig.value.actions = [...buttonConfig.value.actions, newAction]
    console.log('Added action:', newAction)
  }
  
  const removeAction = (index: number) => {
    buttonConfig.value.actions = buttonConfig.value.actions.filter((_, i) => i !== index)
    console.log('Removed action at index:', index)
  }
  
  const updateActionParameter = (actionIndex: number, paramKey: string, value: any) => {
    const actions = [...buttonConfig.value.actions]
    actions[actionIndex] = {
      ...actions[actionIndex],
      parameters: {
        ...actions[actionIndex].parameters,
        [paramKey]: value
      }
    }
    buttonConfig.value.actions = actions
    console.log(`Updated action ${actionIndex} parameter ${paramKey}:`, value)
  }
  
  const getDefaultActionParameters = (type: string) => {
    switch (type) {
      case 'shell':
        return { command: '' }
      case 'http':
        return { url: '', method: 'GET' }
      case 'hotkey':
        return { keys: '' }
      case 'multimedia':
        return { action: 'playpause' }
      default:
        return {}
    }
  }
  
  // Profile management functions
  const createProfile = async (name: string) => {
    try {
      const newProfile = await apiRequest('/profiles', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      })
      
      // Create default page for new profile
      await apiRequest('/pages', {
        method: 'POST',
        body: JSON.stringify({
          profile_id: newProfile.id,
          name: 'Página Principal',
          order_idx: 0,
          data: {}
        })
      })
      
      await loadProfiles()
      
      // Auto-select the new profile
      selectedProfile.value = newProfile.id
      saveSelectedProfile(newProfile.id)
      await loadProfile()
      
      return newProfile
    } catch (error) {
      console.error('Failed to create profile:', error)
      throw error
    }
  }
  
  // Grid management functions
  const changeGridSize = (deltaX: number, deltaY: number) => {
    if (deltaX !== 0) {
      const newCols = gridCols.value + deltaX
      if (newCols >= 3 && newCols <= 8) {
        gridCols.value = newCols
      }
    }
    
    if (deltaY !== 0) {
      const newRows = gridRows.value + deltaY
      if (newRows >= 2 && newRows <= 6) {
        gridRows.value = newRows
      }
    }
  }
  
  // Swap handling
  const handleSwap = async (event: any) => {
    console.log('🔄 Swap event received:', event)
    
    // Set swapping flag to prevent WebSocket interference
    isSwapping.value = true
    
    try {
      // Get the new mapping after swap
      const newMap = event.map
      
      // Validate that newMap exists and is an object
      if (!newMap || typeof newMap !== 'object') {
        console.warn('❌ Invalid or missing map in swap event:', event)
        return
      }
      
      console.log('📍 Current buttons before swap:', currentButtons.value.map(b => ({ id: b.id, position: b.position })))
      console.log('🗺️ New map:', newMap)
    
    // Create a batch of updates to minimize API calls and maintain consistency
    const positionUpdates: Array<{ button: ButtonEntity, newPosition: number }> = []
    
    // Find all buttons that need position updates
    for (const button of currentButtons.value) {
      // Find which slot this button is now in
      const newSlot = Object.keys(newMap).find(slot => 
        newMap[slot] === `item-${button.id}`
      )
      
      if (newSlot) {
        const newPosition = parseInt(newSlot.replace('slot-', ''))
        
        if (button.position !== newPosition) {
          positionUpdates.push({ button, newPosition })
        }
      }
    }
    
    // Also check if any empty slots now contain buttons (shouldn't happen in normal drag, but for safety)
    for (const [slotId, itemId] of Object.entries(newMap)) {
      if (typeof itemId === 'string' && itemId.startsWith('empty-')) {
        // This is an empty slot, no action needed
        continue
      }
    }
    
    // Execute all position updates
    const updatePromises = positionUpdates.map(async ({ button, newPosition }) => {
      try {
        // Update in backend first
        await apiRequest(`/buttons/${button.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            data: button.data,
            position: newPosition
          })
        })
        
        // Update locally only after successful backend update
        button.position = newPosition
        
        console.log(`Button ${button.id} moved to position ${newPosition}`)
        return { success: true, buttonId: button.id, newPosition }
      } catch (error) {
        console.error(`Failed to update button ${button.id} position:`, error)
        return { success: false, buttonId: button.id, error }
      }
    })
    
    // Wait for all updates to complete
    const results = await Promise.allSettled(updatePromises)
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
    
      console.log(`✅ Swap completed: ${successful} successful, ${failed} failed position updates`)
      console.log('📍 Current buttons after swap:', currentButtons.value.map(b => ({ id: b.id, position: b.position })))
      
      // No need to reload buttons from API - positions are already updated locally
      // This prevents re-renders and maintains smooth drag & drop experience
    } finally {
      // Always clear the swapping flag
      setTimeout(() => {
        isSwapping.value = false
        console.log('🔓 Swap operation completed, WebSocket updates re-enabled')
      }, 1000) // Wait 1 second to ensure all WebSocket messages are processed
    }
  }
  
  // Auto-save with debouncing
  const debouncedSave = () => {
    if (saveTimeout.value) clearTimeout(saveTimeout.value)
    if (isChangingButton.value || isSwapping.value) return // Don't save while changing buttons or swapping
    
    saveTimeout.value = setTimeout(() => {
      saveButtonConfig()
    }, 300)
  }
  
  // Cleanup function
  const cleanup = () => {
    ws?.close()
    if (saveTimeout.value) clearTimeout(saveTimeout.value)
  }
  
  return {
    // State
    connectionStatus,
    connectionText,
    profiles,
    selectedProfile,
    currentProfile,
    currentPage,
    currentButtons,
    plugins,
    gridCols,
    gridRows,
    selectedButton,
    executingButtons,
    buttonConfig,
    
    // Computed
    getButtonData,
    getButtonStyle,
    
    // Functions
    connectWebSocket,
    loadProfiles,
    loadProfile,
    loadButtons,
    getButton,
    selectButton,
    executeButton,
    saveButtonConfig,
    addAction,
    removeAction,
    updateActionParameter,
    createProfile,
    changeGridSize,
    handleSwap,
    debouncedSave,
    cleanup,
    
    // Internal state for watchers
    isChangingButton,
    isSaving,
    isSwapping,
    saveTimeout
  }
}