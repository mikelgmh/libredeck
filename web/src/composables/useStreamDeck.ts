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
  const currentPages = ref<PageData[]>([])
  const currentButtons = ref<ButtonEntity[]>([])
  const plugins = ref<any[]>([])

  // Grid State
  const gridCols = ref(5)
  const gridRows = ref(3)
  const selectedButton = ref<number | null>(null)
  const executingButtons = ref<number[]>([])

  // Dynamic button values for real-time updates (any plugin with dynamic actions)
  const dynamicButtonValues = ref(new Map<number, any>())

  // Update intervals for dynamic buttons
  const updateIntervals = ref(new Map<number, number>())

  // Button Config
  const buttonConfig = ref<ButtonData>({
    label: '',
    textTop: '',
    textBottom: '',
    fontSize: 14,
    emoji: '',
    icon: '',
    backgroundColor: '#374151',
    textColor: '#f1f5f9',
    actions: []
  })

  // WebSocket
  let ws: WebSocket | null = null

  // Flag to prevent infinite loops when receiving page change broadcasts
  const isRemotePageChange = ref(false)

  // Flag to prevent infinite loops when receiving profile change broadcasts
  const isRemoteProfileChange = ref(false)

  // Get dynamic base URLs based on current host
  const getApiBase = () => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
      const hostname = window.location.hostname
      return `${protocol}//${hostname}:3001/api/v1`
    }
    return 'http://localhost:3001/api/v1'
  }

  const getWsUrl = () => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const hostname = window.location.hostname
      return `${protocol}//${hostname}:3002`
    }
    return 'ws://localhost:3002'
  }

  const API_BASE = getApiBase()
  const WS_URL = getWsUrl()

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
      const config = {
        ...buttonConfig.value,
        // Force reactivity by accessing reactive values
        _forceUpdate: selectedButton.value
      }

      // Check for dynamic values even for selected button (any plugin with dynamic actions)
      const dynamicValue = dynamicButtonValues.value.get(position)
      if (dynamicValue && hasDynamicAction(button!)) {
        console.log(`📊 Applying dynamic value for selected button at position ${position}:`, dynamicValue)
        return {
          ...config,
          dynamicValue: dynamicValue.value !== undefined && dynamicValue.unit ? 
            `${dynamicValue.value}${dynamicValue.unit}` : 
            (dynamicValue.description || 'N/A'),
        }
      }

      return config
    }
    // Otherwise return saved data or empty object
    const savedData = button?.data || {
      label: '',
      textTop: '',
      textBottom: '',
      fontSize: 14,
      icon: '',
      emoji: '',
      backgroundColor: '#374151',
      textColor: '#f1f5f9',
      actions: []
    }

      // Check for dynamic values (any plugin with dynamic actions)
      const dynamicValue = dynamicButtonValues.value.get(position)
      if (dynamicValue && hasDynamicAction(button!)) {
        console.log(`📊 Applying dynamic value for position ${position}:`, dynamicValue)
        // For dynamic actions, show dynamic value instead of static label
        return {
          ...savedData,
          dynamicValue: dynamicValue.value !== undefined && dynamicValue.unit ? 
            `${dynamicValue.value}${dynamicValue.unit}` : 
            (dynamicValue.description || 'N/A'),
          // Keep other properties from saved data
        }
      }    return savedData
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

        console.log('🔌 WebSocket connected, subscribing to topics...')
        ws?.send(JSON.stringify({
          type: 'subscribe',
          payload: { topics: ['profiles', 'buttons', 'actions', 'plugins', 'pages'] }
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

  const handleWebSocketMessage = async (message: any) => {
    switch (message.type) {
      case 'connected':
        console.log('🔗 WebSocket connected:', message.payload)
        break
      case 'subscribed':
        console.log('✅ WebSocket subscribed to topics:', message.payload)
        break
      case 'profile.updated':
        loadProfiles()
        break
      case 'page.updated':
        // Reload pages when a page is updated (renamed) on another device
        if (selectedProfile.value) {
          const pages = await apiRequest(`/pages?profileId=${selectedProfile.value}`)
          currentPages.value = pages
        }
        break
      case 'page.created':
        // Reload pages when a page is created on another device
        if (selectedProfile.value) {
          const pages = await apiRequest(`/pages?profileId=${selectedProfile.value}`)
          currentPages.value = pages
        }
        break
      case 'page.deleted':
        // Reload pages when a page is deleted on another device
        if (selectedProfile.value) {
          const pages = await apiRequest(`/pages?profileId=${selectedProfile.value}`)
          currentPages.value = pages

          // If current page was deleted, select another one
          if (currentPage.value && !pages.find(p => p.id === currentPage.value?.id)) {
            const remainingPages = pages.filter(p => p.is_folder === 0)
            if (remainingPages.length > 0) {
              await selectPage(remainingPages[0].id)
            } else {
              currentPage.value = null
              currentButtons.value = []
              selectedButton.value = null
            }
          }
        }
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
      case 'page.navigate':
        console.log('🧭 Page navigation requested:', message.payload)
        console.log('📥 Received page.navigate, calling selectPage with isRemotePageChange = true')
        isRemotePageChange.value = true
        try {
          if (message.payload.pageId) {
            await selectPage(message.payload.pageId)
          }
          console.log('✅ Page navigation completed')
        } catch (error) {
          console.error('❌ Error during page navigation:', error)
        } finally {
          isRemotePageChange.value = false
        }
        break
      case 'profile.navigate':
        console.log('👤 Profile navigation requested:', message.payload)
        isRemoteProfileChange.value = true
        if (message.payload.profileId) {
          selectedProfile.value = message.payload.profileId
          await loadProfile()
        }
        isRemoteProfileChange.value = false
        break
      case 'action.finished':
        // Remove executing state after action completes
        break
    }
  }

  // Data loading functions
  const loadProfiles = async () => {
    try {
      profiles.value = await apiRequest('/profiles')

      // Check if we have at least one profile
      if (profiles.value.length === 0) {
        console.error('No profiles found in database. Please run setup first.')
        return
      }

      // Ensure there's always a default profile
      const hasDefaultProfile = profiles.value.some(p => {
        let data = p.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            data = {}
          }
        }
        return data?.isDefault === true
      })

      if (!hasDefaultProfile && profiles.value.length > 0) {
        // Mark the first profile as default
        const firstProfile = profiles.value[0]
        let data = firstProfile.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            data = {}
          }
        }
        const updatedData = { ...data, isDefault: true }
        
        await apiRequest(`/profiles/${firstProfile.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: firstProfile.name,
            data: updatedData
          })
        })
        
        // Update local data
        firstProfile.data = updatedData
        console.log('Marked first profile as default:', firstProfile.id)
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

      // Load plugins
      await loadPlugins()
    } catch (error) {
      console.error('Failed to load profiles:', error)
    }
  }

  const loadProfile = async () => {
    if (!selectedProfile.value) {
      stopDynamicUpdates()
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

      console.log('📂 Loaded profile:', currentProfile.value)
      console.log('📦 Profile data (raw):', currentProfile.value.data)

      // Parse data if it's a string
      let profileData = currentProfile.value.data
      if (typeof profileData === 'string') {
        try {
          profileData = JSON.parse(profileData)
          console.log('📦 Profile data (parsed):', profileData)
        } catch (e) {
          console.error('Failed to parse profile data:', e)
          profileData = {}
        }
      }

      // Restore grid size from profile data
      if (profileData?.gridCols) {
        gridCols.value = profileData.gridCols
        console.log('📐 Restored gridCols from profile:', gridCols.value)
      } else {
        console.log('⚠️ No gridCols found in profile data, using default:', gridCols.value)
      }

      if (profileData?.gridRows) {
        gridRows.value = profileData.gridRows
        console.log('📐 Restored gridRows from profile:', gridRows.value)
      } else {
        console.log('⚠️ No gridRows found in profile data, using default:', gridRows.value)
      }

      const pages = await apiRequest(`/pages?profileId=${selectedProfile.value}`)
      currentPages.value = pages

      // Load first non-folder page as current page, or first page if no non-folder pages exist
      const firstPage = pages.find(p => p.is_folder === 0) || pages[0]
      if (firstPage) {
        currentPage.value = firstPage
        await loadButtons()
        
        // Start dynamic updates for PC Vitals buttons
        await startDynamicUpdates()
      } else {
        // Create default page
        currentPage.value = await apiRequest('/pages', {
          method: 'POST',
          body: JSON.stringify({
            profile_id: selectedProfile.value,
            name: 'Página Principal',
            order_idx: 0,
            is_folder: 0,
            data: { gridCols: gridCols.value, gridRows: gridRows.value }
          })
        })
        currentPages.value = [currentPage.value]
        currentButtons.value = []
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const loadPlugins = async () => {
    try {
      const pluginData = await apiRequest('/plugins/actions')
      plugins.value = pluginData
      console.log('🔌 Loaded plugins:', plugins.value)
    } catch (error) {
      console.error('Failed to load plugins:', error)
    }
  }

  const loadButtons = async () => {
    if (!currentPage.value) {
      console.log('⚠️ No current page selected, cannot load buttons')
      return
    }

    try {
      const buttons = await apiRequest(`/buttons?pageId=${currentPage.value.id}`)
      currentButtons.value = buttons
      console.log(`🔘 Loaded ${buttons.length} buttons for page ${currentPage.value.name}`)
    } catch (error) {
      console.error('Failed to load buttons:', error)
      currentButtons.value = []
    }
  }

  // Button management functions
  const getButton = (position: number): ButtonEntity | undefined => {
    return currentButtons.value.find((btn) => btn.position === position)
  }

  const selectButton = async (position: number) => {
    // Stop dynamic updates for previously selected button if it doesn't have saved dynamic action
    if (selectedButton.value !== null && selectedButton.value !== position) {
      const prevButton = getButton(selectedButton.value)
      if (prevButton && !hasDynamicAction(prevButton)) {
        stopDynamicUpdateForButton(selectedButton.value)
      }
    }

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
      let buttonData = {
        label: button.data?.label || '',
        textTop: button.data?.textTop || '',
        textBottom: button.data?.textBottom || '',
        fontSize: button.data?.fontSize || 14,
        icon: button.data?.icon || '',
        emoji: button.data?.emoji || '',
        backgroundColor: button.data?.backgroundColor || '#374151',
        textColor: button.data?.textColor || '#f1f5f9',
        actions: button.data?.actions ? JSON.parse(JSON.stringify(button.data.actions)) : []
      }

      // Fix legacy PC Vitals actions that have pluginId: null
      if (buttonData.actions) {
        buttonData.actions = buttonData.actions.map((action: any) => {
          if (action.type === 'pc-vitals.monitor' && action.pluginId === null) {
            console.log('🔧 Fixing legacy PC Vitals action, setting pluginId to pc-vitals')
            return { ...action, pluginId: 'pc-vitals' }
          }
          return action
        })
      }

      buttonConfig.value = buttonData
    } else {
      buttonConfig.value = {
        label: '',
        textTop: '',
        textBottom: '',
        fontSize: 14,
        icon: '',
        emoji: '',
        backgroundColor: '#374151',
        textColor: '#f1f5f9',
        actions: []
      }
    }

    // Restart dynamic updates to include/exclude the newly selected button
    await startDynamicUpdates()
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

  const deleteButton = async (position: number) => {
    const button = getButton(position)
    if (!button) {
      console.log('No button to delete at position:', position)
      return
    }

    try {
      console.log('🗑️ Deleting button at position:', position, 'Button ID:', button.id)

      await apiRequest(`/buttons/${button.id}`, {
        method: 'DELETE'
      })

      console.log('✅ Button deleted successfully')

      // If this was the selected button, deselect it
      if (selectedButton.value === position) {
        selectedButton.value = null
      }

      // Reload buttons to update UI
      await loadButtons()
    } catch (error) {
      console.error('❌ Failed to delete button:', error)
    }
  }

  // Button configuration functions
  const saveButtonConfig = async () => {
    if (selectedButton.value === null || !currentPage.value) {
      isSaving.value = false
      return
    }

    const position = selectedButton.value
    const existingButton = getButton(position)

    // Only save if there's actual content to save
    const hasContent = buttonConfig.value.label?.trim() ||
      buttonConfig.value.textTop?.trim() ||
      buttonConfig.value.textBottom?.trim() ||
      buttonConfig.value.emoji?.trim() ||
      buttonConfig.value.icon?.trim() ||
      buttonConfig.value.actions.length > 0

    console.log('💾 Saving button at position:', position, 'Existing:', !!existingButton, 'HasContent:', hasContent)

    try {
      if (existingButton) {
        if (hasContent) {
          // Update existing button
          console.log('📝 Updating button', existingButton.id, 'with data:', buttonConfig.value)
          await apiRequest(`/buttons/${existingButton.id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: buttonConfig.value })
          })

          // Update local data
          existingButton.data = { ...buttonConfig.value }
          console.log('✅ Button updated successfully')

          // Force reactivity update
          await nextTick()
        } else {
          // Delete button if no content
          console.log('🗑️ Deleting button', existingButton.id, 'because no content')
          await apiRequest(`/buttons/${existingButton.id}`, {
            method: 'DELETE'
          })

          // Remove from local data
          const index = currentButtons.value.findIndex(b => b.id === existingButton.id)
          if (index > -1) {
            currentButtons.value.splice(index, 1)
          }
          console.log('✅ Button deleted successfully')
        }
      } else if (hasContent) {
        // Create new button only if there's content
        console.log('➕ Creating new button at position', position, 'with data:', buttonConfig.value)
        const newButton = await apiRequest('/buttons', {
          method: 'POST',
          body: JSON.stringify({
            page_id: currentPage.value.id,
            position,
            data: buttonConfig.value
          })
        })

        currentButtons.value.push(newButton)
        console.log('✅ Button created:', newButton.id, 'Data:', newButton)
      } else {
        // No content and no existing button - nothing to do
        console.log('⏭️ No content to save for empty button at position:', position)
      }

      // Clear dynamic button values for this position to force refresh with new config
      dynamicButtonValues.value.delete(position)
      console.log('🧹 Cleared dynamic values for position', position, 'to force refresh')

      // Restart dynamic updates to include/exclude the newly saved button
      await startDynamicUpdates()
    } catch (error) {
      console.error('❌ Failed to save button:', error)
    } finally {
      isSaving.value = false
    }
  }

  // Action management functions
  const addAction = (type: string) => {
    // Find the plugin that has this action type
    let pluginId = null
    for (const plugin of plugins.value) {
      const [pid, pluginData] = plugin
      // For full action types like 'pc-vitals.monitor', check if the plugin ID matches the prefix
      if (type.includes('.')) {
        const [pluginPrefix, actionId] = type.split('.')
        if (pid === pluginPrefix && pluginData.actions && pluginData.actions.some((action: any) => action[0] === actionId)) {
          pluginId = pid
          break
        }
      } else {
        // For simple action types, check direct match
        if (pluginData.actions && pluginData.actions.some((action: any) => action[0] === type)) {
          pluginId = pid
          break
        }
      }
    }

    const newAction = {
      id: Date.now().toString(),
      type,
      pluginId,
      parameters: getDefaultActionParameters(type)
    }

    // Crear nuevo objeto para disparar reactividad
    buttonConfig.value = {
      ...buttonConfig.value,
      actions: [...buttonConfig.value.actions, newAction]
    }
    console.log('➕ Added action:', newAction, 'pluginId found:', pluginId)
  }

  const removeAction = (index: number) => {
    // Crear nuevo objeto para disparar reactividad
    buttonConfig.value = {
      ...buttonConfig.value,
      actions: buttonConfig.value.actions.filter((_, i) => i !== index)
    }
    console.log('🗑️ Removed action at index:', index)
  }

  const reorderActions = async (newOrderedActions: any[]) => {
    // Bloquear recargas de WebSocket durante todo el proceso
    isSwapping.value = true
    console.log('🔒 isSwapping = true, blocking WebSocket reloads')

    // NO actualizar buttonConfig local para evitar re-renders que rompan Swapy
    // En su lugar, guardar directamente en la BD
    console.log(`🔄 Reordering actions:`, newOrderedActions.map(a => a.type).join(' → '))

    // Guardar directamente con el nuevo orden
    const position = selectedButton.value
    if (position === null || !currentPage.value) {
      isSwapping.value = false
      return
    }

    const button = getButton(position)
    if (!button) {
      isSwapping.value = false
      return
    }

    // Crear el config actualizado con las acciones reordenadas
    const updatedConfig = {
      ...buttonConfig.value,
      actions: newOrderedActions
    }

    try {
      await apiRequest(`/buttons/${button.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          page_id: currentPage.value.id,
          position,
          data: updatedConfig
        })
      })

      console.log('✅ Actions reordered and saved')

      // NO actualizar buttonConfig aquí - dejar que Swapy mantenga el orden visual
      // y que el WebSocket sincronice cuando desbloqueemos isSwapping

      // Esperar antes de desbloquear para que Swapy complete su animación
      setTimeout(() => {
        isSwapping.value = false
        console.log('🔓 isSwapping = false, allowing WebSocket reloads')

        // Ahora sí, recargar desde la API para sincronizar
        loadButtons()
      }, 300)
    } catch (error) {
      console.error('❌ Failed to save reordered actions:', error)
      isSwapping.value = false
    }
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
    // Crear nuevo objeto para disparar reactividad
    buttonConfig.value = {
      ...buttonConfig.value,
      actions
    }
    console.log(`✏️ Updated action ${actionIndex} parameter ${paramKey}:`, value)
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
      case 'page':
        return { pageId: '', pageName: '' }
      case 'open-url':
        return { url: '' }
      case 'pc-vitals.monitor':
        return { component: 'cpu', metric: 'usage', updateInterval: 1000 }
      default:
        return {}
    }
  }

  // Profile management functions
  const selectProfile = async (profileId: string) => {
    // Stop existing dynamic updates
    stopDynamicUpdates()
    
    selectedProfile.value = profileId
    await loadProfile()

    // Broadcast profile change to other devices (only for local changes)
    if (!isRemoteProfileChange.value) {
      ws?.send(JSON.stringify({
        type: 'profile.select',
        payload: { profileId }
      }))
    }
  }
  const createProfile = async (name: string) => {
    try {
      const newProfile = await apiRequest('/profiles', {
        method: 'POST',
        body: JSON.stringify({ 
          name: name.trim(),
          data: {} // New profiles are not default
        })
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
      await selectProfile(newProfile.id)

      return newProfile
    } catch (error) {
      console.error('Failed to create profile:', error)
      throw error
    }
  }

  const updateProfile = async (profileId: string, updates: any) => {
    try {
      const profile = profiles.value.find(p => p.id === profileId)
      if (!profile) return

      const updatedProfile = await apiRequest(`/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updates.name || profile.name,
          data: updates.data || profile.data
        })
      })

      // Update local profile
      const index = profiles.value.findIndex(p => p.id === profileId)
      if (index > -1) {
        profiles.value[index] = updatedProfile
      }

      // If this is the current profile, update currentProfile
      if (currentProfile.value?.id === profileId) {
        currentProfile.value = updatedProfile
      }

      console.log('✅ Profile updated successfully')
    } catch (error) {
      console.error('❌ Failed to update profile:', error)
      throw error
    }
  }

  const deleteProfile = async (profileId: string) => {
    try {
      // Check if we're deleting the default profile
      const profileToDelete = profiles.value.find(p => p.id === profileId)
      let wasDefault = false
      if (profileToDelete) {
        let data = profileToDelete.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            data = {}
          }
        }
        wasDefault = data?.isDefault === true
      }

      await apiRequest(`/profiles/${profileId}`, {
        method: 'DELETE'
      })

      // Remove from local profiles
      const index = profiles.value.findIndex(p => p.id === profileId)
      if (index > -1) {
        profiles.value.splice(index, 1)
      }

      // If we deleted the default profile, mark another one as default
      if (wasDefault && profiles.value.length > 0) {
        const newDefaultProfile = profiles.value[0]
        let data = newDefaultProfile.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            data = {}
          }
        }
        const updatedData = { ...data, isDefault: true }
        
        await apiRequest(`/profiles/${newDefaultProfile.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: newDefaultProfile.name,
            data: updatedData
          })
        })
        
        // Update local data
        newDefaultProfile.data = updatedData
        console.log('Marked new default profile:', newDefaultProfile.id)
      }

      // If this was the selected profile, select another one
      if (selectedProfile.value === profileId) {
        if (profiles.value.length > 0) {
          await selectProfile(profiles.value[0].id)
        } else {
          selectedProfile.value = ''
          currentProfile.value = null
          currentPage.value = null
          currentButtons.value = []
        }
      }

      console.log('✅ Profile deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete profile:', error)
      throw error
    }
  }

  // Page management functions
  const selectPage = async (pageId: string) => {
    const page = currentPages.value.find(p => p.id === pageId)
    if (!page) {
      console.error('Page not found:', pageId)
      return
    }

    // Stop existing dynamic updates
    stopDynamicUpdates()

    // Save current page's button config before switching
    if (selectedButton.value !== null && currentPage.value) {
      const currentButton = getButton(selectedButton.value)
      if (currentButton) {
        const hasChanges = JSON.stringify(currentButton.data) !== JSON.stringify(buttonConfig.value)
        if (hasChanges) {
          await saveButtonConfig()
        }
      }
    }

    currentPage.value = page
    selectedButton.value = null
    buttonConfig.value = {
      label: '',
      textTop: '',
      textBottom: '',
      fontSize: 14,
      emoji: '',
      icon: '',
      backgroundColor: '#374151',
      textColor: '#f1f5f9',
      actions: []
    }

    await loadButtons()

    // Start dynamic updates for PC Vitals buttons
    await startDynamicUpdates()

    // Broadcast page change to other devices (only for local changes)
    if (!isRemotePageChange.value) {
      console.log('📤 Sending page.select message:', { pageId })
      ws?.send(JSON.stringify({
        type: 'page.select',
        payload: { pageId }
      }))
    } else {
      console.log('🔕 Skipping page.select broadcast (remote change)')
    }
  }

  const createPage = async (name: string, isFolder: boolean = false) => {
    if (!selectedProfile.value) {
      throw new Error('No profile selected')
    }

    try {
      const newPage = await apiRequest('/pages', {
        method: 'POST',
        body: JSON.stringify({
          profile_id: selectedProfile.value,
          name: name.trim(),
          order_idx: currentPages.value.length,
          is_folder: isFolder ? 1 : 0,
          data: { gridCols: gridCols.value, gridRows: gridRows.value }
        })
      })

      currentPages.value.push(newPage)

      // If it's not a folder, switch to it after a small delay to allow broadcasts to propagate
      if (!isFolder) {
        setTimeout(() => {
          selectPage(newPage.id)
        }, 100)
      }

      return newPage
    } catch (error: any) {
      // Handle duplicate page name error
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        throw new Error(`Ya existe una página con el nombre "${name}" en este perfil`)
      }
      
      console.error('Failed to create page:', error)
      throw error
    }
  }

  const deletePage = async (pageId: string) => {
    try {
      await apiRequest(`/pages/${pageId}`, {
        method: 'DELETE'
      })

      // Remove from local pages
      const index = currentPages.value.findIndex(p => p.id === pageId)
      if (index > -1) {
        currentPages.value.splice(index, 1)
      }

      // If this was the current page, select another one
      if (currentPage.value?.id === pageId) {
        const remainingPages = currentPages.value.filter(p => p.is_folder === 0)
        if (remainingPages.length > 0) {
          await selectPage(remainingPages[0].id)
        } else {
          currentPage.value = null
          currentButtons.value = []
          selectedButton.value = null
        }
      }

      console.log('✅ Page deleted successfully')
    } catch (error: any) {
      // If the page doesn't exist on the server (404), just remove it locally
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.log('⚠️ Page not found on server, removing locally')
        
        // Remove from local pages anyway
        const index = currentPages.value.findIndex(p => p.id === pageId)
        if (index > -1) {
          currentPages.value.splice(index, 1)
        }

        // If this was the current page, select another one
        if (currentPage.value?.id === pageId) {
          const remainingPages = currentPages.value.filter(p => p.is_folder === 0)
          if (remainingPages.length > 0) {
            await selectPage(remainingPages[0].id)
          } else {
            currentPage.value = null
            currentButtons.value = []
            selectedButton.value = null
          }
        }
        
        console.log('✅ Page removed locally (was not found on server)')
        return // Don't throw error for 404
      }
      
      console.error('❌ Failed to delete page:', error)
      throw error
    }
  }

  const updatePage = async (pageId: string, updates: Partial<PageData>) => {
    try {
      const page = currentPages.value.find(p => p.id === pageId)
      if (!page) return

      const updatedPage = await apiRequest(`/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updates.name || page.name,
          order_idx: updates.order_idx || page.order_idx,
          is_folder: updates.is_folder !== undefined ? updates.is_folder : page.is_folder,
          data: updates.data || page.data
        })
      })

      // Update local page
      const index = currentPages.value.findIndex(p => p.id === pageId)
      if (index > -1) {
        currentPages.value[index] = updatedPage
      }

      // If this is the current page, update currentPage
      if (currentPage.value?.id === pageId) {
        currentPage.value = updatedPage
      }

      console.log('✅ Page updated successfully')
    } catch (error: any) {
      // If the page doesn't exist on the server (404), show warning but don't update locally
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        console.warn('⚠️ Page not found on server, cannot update')
        return // Don't throw error for 404
      }
      
      console.error('❌ Failed to update page:', error)
      throw error
    }
  }

  // Grid management functions
  const changeGridSize = async (deltaX: number, deltaY: number) => {
    let changed = false

    if (deltaX !== 0) {
      const newCols = gridCols.value + deltaX
      if (newCols >= 3 && newCols <= 8) {
        gridCols.value = newCols
        changed = true
      }
    }

    if (deltaY !== 0) {
      const newRows = gridRows.value + deltaY
      if (newRows >= 2 && newRows <= 6) {
        gridRows.value = newRows
        changed = true
      }
    }

    // Save grid size to profile data only if changed
    if (changed && currentProfile.value) {
      try {
        // Create a simple data object with grid size
        const updatedData = {
          gridCols: gridCols.value,
          gridRows: gridRows.value
        }

        console.log('💾 Saving grid size:', updatedData)

        const response = await apiRequest(`/profiles/${currentProfile.value.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: currentProfile.value.name,
            data: updatedData
          })
        })

        console.log('✅ Grid size saved successfully:', response)

        // Update local profile data reference
        // Parse current data if it's a string
        let currentData = currentProfile.value.data
        if (typeof currentData === 'string') {
          try {
            currentData = JSON.parse(currentData)
          } catch (e) {
            currentData = {}
          }
        }

        // Update or initialize data object
        if (!currentData || typeof currentData !== 'object') {
          currentProfile.value.data = updatedData
        } else {
          currentProfile.value.data = {
            ...currentData,
            gridCols: gridCols.value,
            gridRows: gridRows.value
          }
        }

        console.log('📦 Updated local profile data:', currentProfile.value.data)

      } catch (error) {
        console.error('❌ Failed to save grid size:', error)
      }
    }
  }

  // Swap handling
  const handleSwap = async (event: any) => {
    console.log('🔄 Swap event received:', event)

    // Bloquear recargas de WebSocket durante todo el proceso
    isSwapping.value = true
    console.log('🔒 isSwapping = true, blocking WebSocket reloads')

    try {
      // Get the new mapping after swap - onSwapEnd usa slotItemMap
      const newMap = event.slotItemMap?.asObject || event.newSlotItemMap?.asObject || event.map

      // Validate that newMap exists and is an object
      if (!newMap || typeof newMap !== 'object') {
        console.warn('❌ Invalid or missing map in swap event:', event)
        console.log('🔍 Event structure:', JSON.stringify(event, null, 2))
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

      console.log(`📦 Position updates to save: ${positionUpdates.length}`)

      // Execute all position updates - SOLO guardar en BD, NO actualizar local
      const updatePromises = positionUpdates.map(async ({ button, newPosition }) => {
        try {
          // Update in backend ONLY
          await apiRequest(`/buttons/${button.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              data: button.data,
              position: newPosition
            })
          })

          console.log(`✅ Button ${button.id} saved to position ${newPosition}`)
          return { success: true, buttonId: button.id, newPosition }
        } catch (error) {
          console.error(`❌ Failed to update button ${button.id} position:`, error)
          return { success: false, buttonId: button.id, error }
        }
      })

      // Wait for all updates to complete
      const results = await Promise.allSettled(updatePromises)

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length

      console.log(`✅ Swap completed: ${successful} successful, ${failed} failed position updates`)

      // NO actualizar nada localmente - dejar que Swapy controle el DOM completamente
      // Las posiciones están guardadas en BD, y cuando el usuario recargue la página
      // se cargarán correctamente. Durante la sesión actual, Swapy mantiene el orden visual.
    } finally {
      // Desbloquear después de un pequeño delay
      setTimeout(() => {
        isSwapping.value = false
        console.log('🔓 isSwapping = false, swap complete')
      }, 100)
    }
  }

  // Auto-save with debouncing
  const debouncedSave = () => {
    if (saveTimeout.value) clearTimeout(saveTimeout.value)
    if (isChangingButton.value || isSwapping.value) return // Don't save while changing buttons or swapping

    isSaving.value = true
    saveTimeout.value = setTimeout(() => {
      console.log('💾 Auto-saving button config...')
      saveButtonConfig()
    }, 800) // 800ms para dar tiempo a escribir pero sentir rapidez
  }

  // Cleanup function
  const cleanup = () => {
    ws?.close()
    if (saveTimeout.value) clearTimeout(saveTimeout.value)
    stopDynamicUpdates()
  }

  // Dynamic button functions (generic for any plugin)
  const hasDynamicAction = (button: ButtonEntity | null) => {
    // Check saved button data
    if (button?.data?.actions) {
      const hasAction = button.data.actions.some((action: any) => {
        // Check if this action type is marked as dynamic in any plugin
        for (const plugin of plugins.value) {
          const [pluginId, pluginData] = plugin
          if (pluginData.actions) {
            // If action.pluginId is null, infer it from action.type
            const actionPluginId = action.pluginId || action.type.split('.')[0]
            const found = pluginData.actions.some((pluginAction: any) => {
              const actionId = action.type.split('.')[1]
              return pluginAction[0] === actionId && pluginAction[1]?.dynamic === true && actionPluginId === pluginId
            })
            if (found) return true
          }
        }
        return false
      })
      return hasAction
    }
    
    // Check current button config (for selected/unsaved buttons)
    if (selectedButton.value !== null && buttonConfig.value.actions) {
      const hasAction = buttonConfig.value.actions.some((action: any) => {
        // Check if this action type is marked as dynamic in any plugin
        for (const plugin of plugins.value) {
          const [pluginId, pluginData] = plugin
          if (pluginData.actions) {
            // If action.pluginId is null, infer it from action.type
            const actionPluginId = action.pluginId || action.type.split('.')[0]
            const found = pluginData.actions.some((pluginAction: any) => {
              const actionId = action.type.split('.')[1]
              return pluginAction[0] === actionId && pluginAction[1]?.dynamic === true && actionPluginId === pluginId
            })
            if (found) return true
          }
        }
        return false
      })
      return hasAction
    }
    
    return false
  }

  const getDynamicAction = (button: ButtonEntity | null) => {
    // Check saved button data
    if (button?.data?.actions) {
      return button.data.actions.find((action: any) => {
        // Check if this action type is marked as dynamic in any plugin
        for (const plugin of plugins.value) {
          const [pluginId, pluginData] = plugin
          if (pluginData.actions && pluginData.actions.some((pluginAction: any) => {
            // If action.pluginId is null, infer it from action.type
            const actionPluginId = action.pluginId || action.type.split('.')[0]
            const actionId = action.type.split('.')[1]
            return pluginAction[0] === actionId && pluginAction[1]?.dynamic === true && actionPluginId === pluginId
          })) {
            return true
          }
        }
        return false
      })
    }
    
    // Check current button config (for selected/unsaved buttons)
    if (selectedButton.value !== null && buttonConfig.value.actions) {
      return buttonConfig.value.actions.find((action: any) => {
        // Check if this action type is marked as dynamic in any plugin
        for (const plugin of plugins.value) {
          const [pluginId, pluginData] = plugin
          if (pluginData.actions && pluginData.actions.some((pluginAction: any) => {
            // If action.pluginId is null, infer it from action.type
            const actionPluginId = action.pluginId || action.type.split('.')[0]
            const actionId = action.type.split('.')[1]
            return pluginAction[0] === actionId && pluginAction[1]?.dynamic === true && actionPluginId === pluginId
          })) {
            return true
          }
        }
        return false
      })
    }
    
    return null
  }

  const updateDynamicButtonValue = async (position: number, button: ButtonEntity) => {
    const dynamicAction = getDynamicAction(button)
    if (!dynamicAction) return

    try {
      console.log(`🔄 Updating dynamic action for button at position ${position}`)
      
      const response = await apiRequest('/actions/execute', {
        method: 'POST',
        body: JSON.stringify({
          action: dynamicAction,
          context: {
            buttonId: button.id,
            pageId: button.page_id,
            profileId: currentProfile.value?.id,
            position
          }
        })
      })

      if (response.result) {
        console.log(`✅ Dynamic action updated for position ${position}:`, response.result)
        dynamicButtonValues.value.set(position, response.result)
      } else {
        console.warn(`⚠️ No result in dynamic action response for position ${position}`)
      }
    } catch (error) {
      console.error(`❌ Failed to update dynamic button value for position ${position}:`, error)
    }
  }

  const startDynamicUpdates = async () => {
    // Wait for plugins to be loaded
    if (plugins.value.length === 0) {
      console.log('⏳ Waiting for plugins to load...')
      await loadPlugins()
    }

    // Clear existing intervals
    updateIntervals.value.forEach(interval => clearInterval(interval))
    updateIntervals.value.clear()

    console.log('🔄 Starting dynamic updates for buttons:', currentButtons.value.length)

    // Start new intervals for buttons with dynamic actions (only saved buttons)
    currentButtons.value.forEach((button: ButtonEntity) => {
      if (hasDynamicAction(button) && button.position !== selectedButton.value) {
        const dynamicAction = getDynamicAction(button)
        const updateInterval = dynamicAction?.parameters?.updateInterval || 1000

        console.log(`📊 Setting up dynamic monitoring for saved button at position ${button.position}:`, {
          actionType: dynamicAction?.type,
          updateInterval
        })

        const interval = setInterval(() => {
          updateDynamicButtonValue(button.position, button)
        }, updateInterval)

        updateIntervals.value.set(button.position, interval)

        // Initial update
        updateDynamicButtonValue(button.position, button)
      }
    })

    // Also handle the currently selected button if it has dynamic action
    if (selectedButton.value !== null) {
      const selectedBtn = getButton(selectedButton.value)
      if (hasDynamicAction(selectedBtn)) {
        const dynamicAction = getDynamicAction(selectedBtn)
        const updateInterval = dynamicAction?.parameters?.updateInterval || 1000

        console.log(`📊 Setting up dynamic monitoring for selected button at position ${selectedButton.value}:`, {
          actionType: dynamicAction?.type,
          updateInterval
        })

        const interval = setInterval(() => {
          updateDynamicButtonValue(selectedButton.value, selectedBtn!)
        }, updateInterval)

        updateIntervals.value.set(selectedButton.value, interval)

        // Initial update
        updateDynamicButtonValue(selectedButton.value, selectedBtn!)
      }
    }

    console.log(`✅ Dynamic updates started for ${updateIntervals.value.size} buttons`)
  }

  const stopDynamicUpdates = () => {
    updateIntervals.value.forEach(interval => clearInterval(interval))
    updateIntervals.value.clear()
    dynamicButtonValues.value.clear()
  }

  const stopDynamicUpdateForButton = (position: number) => {
    const interval = updateIntervals.value.get(position)
    if (interval) {
      clearInterval(interval)
      updateIntervals.value.delete(position)
      dynamicButtonValues.value.delete(position)
      console.log(`🛑 Stopped dynamic updates for button at position ${position}`)
    }
  }

  return {
    // State
    connectionStatus,
    connectionText,
    profiles,
    selectedProfile,
    currentProfile,
    currentPage,
    currentPages,
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
  selectProfile,
  loadButtons,
  loadPlugins,
  getButton,
  selectButton,
  executeButton,
  deleteButton,
  saveButtonConfig,
  addAction,
  removeAction,
  reorderActions,
  updateActionParameter,
  createProfile,
  updateProfile,
  deleteProfile,
  selectPage,
  createPage,
  deletePage,
  updatePage,
  changeGridSize,
  handleSwap,
  debouncedSave,
  cleanup,
  
  // Dynamic button functions (generic for any plugin)
  hasDynamicAction,
  getDynamicAction,
  updateDynamicButtonValue,
  startDynamicUpdates,
  stopDynamicUpdates,
  stopDynamicUpdateForButton,
  
  // Internal state for watchers
  isChangingButton,
  isSaving,
  isSwapping,
  saveTimeout
  }
}