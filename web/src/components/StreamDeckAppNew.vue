<template>
  <div class="flex h-screen bg-base-100 text-base-content" :class="{ 'overflow-hidden': appStore.mode === 'deck' }">
    <!-- Edit Mode Layout -->
    <template v-if="appStore.mode === 'edit'">
      <!-- Sidebar Izquierdo -->
      <Sidebar
        :connectionStatus="connectionStatus"
        :connectionText="connectionText"
        :profiles="profiles"
        :selectedProfile="selectedProfile"
        :selectedButton="selectedButton"
        :buttonConfig="buttonConfig"
        :plugins="plugins"
        :availablePages="availablePages"
        @profile-changed="handleProfileChange"
        @profile-created="handleProfileCreate"
        @update-button-label="updateButtonLabel"
        @update-button-text-top="updateButtonTextTop"
        @update-button-text-bottom="updateButtonTextBottom"
        @update-button-font-size="updateButtonFontSize"
        @update-button-icon="updateButtonIcon"
        @update-button-emoji="updateButtonEmoji"
        @update-button-background-color="updateButtonBackgroundColor"
        @update-button-text-color="updateButtonTextColor"
        @add-action="addAction"
        @remove-action="removeAction"
        @reorder-actions="reorderActions"
        @update-action-parameter="(args) => updateActionParameter(args[0], args[1], args[2])"
      />

      <!-- Main Content -->
      <div class="flex-1 flex flex-col">
        <!-- Toolbar -->
        <Toolbar
          :profiles="profiles"
          :selectedProfile="selectedProfile"
          :gridCols="gridCols"
          :gridRows="gridRows"
          :currentLocale="currentLocale"
          :currentMode="appStore.mode"
          @profile-changed="handleProfileChange"
          @grid-size-change="changeGridSize"
          @show-qr="showQRModal"
          @show-profile-settings="showProfileSettingsModal"
          @language-changed="switchLanguage"
          @mode-changed="appStore.setMode"
          @check-updates="showUpdateModal"
        />

        <!-- StreamDeck Grid -->
        <StreamDeckGrid
          :gridCols="gridCols"
          :gridRows="gridRows"
          :selectedButton="selectedButton"
          :executingButtons="executingButtons"
          :buttonConfig="buttonConfig"
          :getButton="getButton"
          :getButtonData="getButtonData"
          :getButtonStyle="getButtonStyle"
          :mode="appStore.mode"
          @button-click="selectButton"
          @button-execute="executeButton"
          @button-delete="deleteButton"
          @swap="handleSwap"
          @grid-size-change="changeGridSize"
          @mode-change="appStore.setMode"
        />

        <!-- Page Navigation -->
        <PageNavigation
          :currentPage="currentPage"
          :pages="currentPages"
          @page-selected="handlePageSelected"
          @page-created="handlePageCreated"
          @page-deleted="handlePageDeleted"
          @page-renamed="handlePageRenamed"
        />
      </div>

      <!-- Sidebar Derecho - Biblioteca de Acciones -->
      <ActionsRightSidebar 
        :plugins="plugins"
      />
    </template>

    <!-- Deck Mode Layout -->
    <template v-else>
      <!-- Full Screen StreamDeck Grid -->
      <StreamDeckGrid
        :gridCols="gridCols"
        :gridRows="gridRows"
        :selectedButton="selectedButton"
        :executingButtons="executingButtons"
        :buttonConfig="buttonConfig"
        :getButton="getButton"
        :getButtonData="getButtonData"
        :getButtonStyle="getButtonStyle"
        :mode="appStore.mode"
        @button-click="selectButton"
        @button-execute="executeButton"
        @button-delete="deleteButton"
        @swap="handleSwap"
        @grid-size-change="changeGridSize"
        @mode-change="appStore.setMode"
      />
    </template>
    
    <!-- QR Modal -->
    <QRModal ref="qrModal" />
    
    <!-- Profile Settings Modal -->
    <ProfileSettingsModal 
      ref="profileSettingsModal"
      :profiles="profiles"
      :selectedProfile="selectedProfile"
      @profile-changed="handleProfileChange"
      @profile-created="handleProfileCreate"
      @profile-updated="handleProfileUpdate"
      @profile-deleted="handleProfileDeleted"
    />
    
    <!-- Update Modal -->
    <UpdateModal 
      ref="updateModal"
      :currentVersion="currentVersion"
      :latestVersion="latestVersion"
      :updateInfo="updateInfo"
      :isChecking="isCheckingUpdate"
      :isUpdating="isUpdating"
      :updateResult="updateResult"
      @check-for-updates="checkForUpdates"
      @start-update="startUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { createApp } from 'vue'
import pinia from '../composables/pinia'
import { useAppStore } from '../store/app'
import { useStreamDeck } from '../composables/useStreamDeck'
import { useI18nStore } from '../composables/useI18n'
import { Edit, Grid3x3 } from 'lucide-vue-next'
import Sidebar from './Sidebar.vue'
import Toolbar from './Toolbar.vue'
import StreamDeckGrid from './StreamDeckGrid.vue'
import ActionsRightSidebar from './ActionsRightSidebar.vue'
import QRModal from './QRModal.vue'
import UpdateModal from './UpdateModal.vue'
import ProfileSettingsModal from './ProfileSettingsModal.vue'
import PageNavigation from './PageNavigation.vue'

// Configurar Pinia
const app = createApp({})
app.use(pinia)

// Use stores
const appStore = useAppStore()
const { t, currentLocale, setLocale, loadSavedLocale } = useI18nStore()

// Load saved locale on mount
loadSavedLocale()

// Language switcher function
const switchLanguage = (newLocale: string) => {
  setLocale(newLocale)
}

const handleLanguageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  switchLanguage(target.value)
}

// QR Modal ref
const qrModal = ref<InstanceType<typeof QRModal> | null>(null)

// Profile Settings Modal ref
const profileSettingsModal = ref<InstanceType<typeof ProfileSettingsModal> | null>(null)

// Update Modal ref
const updateModal = ref<InstanceType<typeof UpdateModal> | null>(null)

const showQRModal = () => {
  qrModal.value?.showModal()
}

const showProfileSettingsModal = () => {
  profileSettingsModal.value?.showModal()
}

const showUpdateModal = async () => {
  // Check for updates first to get latest version info
  await checkForUpdates()
  // Always show the modal, even if no update is available
  updateModal.value?.showModal()
}

// Update system functions
const getCurrentVersion = async () => {
  try {
    const daemonUrl = `http://${window.location.hostname}:3001/api/v1/version`
    console.log('Getting current version from:', daemonUrl)
    const response = await fetch(daemonUrl)
    console.log('Version response status:', response.status)
    if (response.ok) {
      const data = await response.json()
      console.log('Current version data:', data)
      currentVersion.value = data.version
    } else {
      const errorText = await response.text()
      console.error('Failed to get current version. Status:', response.status, 'Response:', errorText)
    }
  } catch (error) {
    console.error('Error getting current version:', error)
  }
}

const checkForUpdates = async () => {
  isCheckingUpdate.value = true
  try {
    const daemonUrl = `http://${window.location.hostname}:3001/api/v1/version/check`
    console.log('Checking for updates at:', daemonUrl)
    const response = await fetch(daemonUrl)
    console.log('Response status:', response.status)
    if (response.ok) {
      const data = await response.json()
      console.log('Update data received:', data)
      latestVersion.value = data.latestVersion
      updateInfo.value = data
      
      // Don't show modal automatically - user can check manually
      // if (data.hasUpdate) {
      //   updateModal.value?.showModal()
      // }
    } else {
      const errorText = await response.text()
      console.error('Failed to check for updates. Status:', response.status, 'Response:', errorText)
    }
  } catch (error) {
    console.error('Error checking for updates:', error)
  } finally {
    isCheckingUpdate.value = false
  }
}

const startUpdate = async () => {
  isUpdating.value = true
  updateResult.value = null
  try {
    const daemonUrl = `http://${window.location.hostname}:3001/api/v1/update`
    const response = await fetch(daemonUrl, {
      method: 'POST'
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('Update started:', data)
      // The modal will handle showing progress and completion
    } else {
      throw new Error('Failed to start update')
    }
  } catch (error) {
    console.error('Error starting update:', error)
    updateResult.value = { success: false, message: 'Error al iniciar la actualización. Inténtalo de nuevo.' }
  } finally {
    isUpdating.value = false
  }
}

// Periodic update checking
const startPeriodicUpdateCheck = () => {
  // Check for updates every 4 hours
  updateCheckInterval.value = setInterval(() => {
    checkForUpdates()
  }, 4 * 60 * 60 * 1000)
}

const stopPeriodicUpdateCheck = () => {
  if (updateCheckInterval.value) {
    clearInterval(updateCheckInterval.value)
    updateCheckInterval.value = null
  }
}

// Update system state
const currentVersion = ref<string>('')
const latestVersion = ref<string>('')
const updateInfo = ref<any>(null)
const isCheckingUpdate = ref<boolean>(false)
const isUpdating = ref<boolean>(false)
const updateCheckInterval = ref<NodeJS.Timeout | null>(null)
const updateResult = ref<{ success: boolean; message: string } | null>(null)

// Wake Lock state
const wakeLock = ref<WakeLockSentinel | null>(null)

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock.value = await (navigator as any).wakeLock.request('screen')
      console.log('✅ Screen Wake Lock activado')
      
      wakeLock.value.addEventListener('release', () => {
        console.log('⚠️ Screen Wake Lock liberado')
      })
    }
  } catch (err) {
    console.error('❌ Error al activar Wake Lock:', err)
  }
}

const releaseWakeLock = async () => {
  if (wakeLock.value !== null) {
    try {
      await wakeLock.value.release()
      wakeLock.value = null
      console.log('Screen Wake Lock liberado manualmente')
    } catch (err) {
      console.error('Error al liberar Wake Lock:', err)
    }
  }
}

// Use the composable
const {
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
  getButton,
  selectButton,
  executeButton,
  deleteButton,
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
  
  // Internal state for watchers
  isChangingButton,
  isSaving,
  saveTimeout
} = useStreamDeck()

// Computed properties
const availablePages = computed(() => {
  return currentPages.value
    .filter(page => page.is_folder === 0)
    .map(page => ({ id: page.id, name: page.name }))
})

// Event handlers for child components
const handleProfileChange = async (profileId: string) => {
  await selectProfile(profileId)
}

const handleProfileCreate = async (name: string) => {
  const newProfile = await createProfile(name)
  await selectProfile(newProfile.id)
}

const handleProfileUpdate = async (profileId: string, updates: any) => {
  await updateProfile(profileId, updates)
}

const handleProfileDeleted = async (profileId: string) => {
  await deleteProfile(profileId)
}

// Page event handlers
const handlePageSelected = async (pageId: string) => {
  await selectPage(pageId)
}

const handlePageCreated = async (name: string, isFolder: boolean) => {
  try {
    await createPage(name, isFolder)
  } catch (error: any) {
    console.error('❌ Error creating page:', error)
    // Show user-friendly error message
    alert(error.message || 'Error al crear la página. Inténtalo de nuevo.')
  }
}

const handlePageDeleted = async (pageId: string) => {
  try {
    await deletePage(pageId)
  } catch (error) {
    console.error('❌ Error deleting page:', error)
    // Show user-friendly error message
    alert('Error al eliminar la página. Es posible que ya haya sido eliminada.')
  }
}

const handlePageRenamed = async (pageId: string, newName: string) => {
  try {
    await updatePage(pageId, { name: newName })
  } catch (error) {
    console.error('❌ Error renaming page:', error)
    // Show user-friendly error message
    alert('Error al renombrar la página. Inténtalo de nuevo.')
  }
}

// Estas funciones actualizan buttonConfig directamente, lo que dispara el watch
const updateButtonLabel = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, label: value }
}

const updateButtonTextTop = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, textTop: value }
}

const updateButtonTextBottom = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, textBottom: value }
}

const updateButtonFontSize = (value: number) => {
  buttonConfig.value = { ...buttonConfig.value, fontSize: value }
}

const updateButtonIcon = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, icon: value }
}

const updateButtonEmoji = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, emoji: value }
}

const updateButtonBackgroundColor = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, backgroundColor: value }
}

const updateButtonTextColor = (value: string) => {
  buttonConfig.value = { ...buttonConfig.value, textColor: value }
}

// Lifecycle
onMounted(async () => {
  loadProfiles()
  connectWebSocket()
  
  // Add keyboard listener for Delete key
  window.addEventListener('keydown', handleKeyDown)
  
  // Activar Wake Lock para mantener pantalla encendida
  await requestWakeLock()
  
  // Reactivar Wake Lock si la página vuelve a ser visible
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLock.value === null) {
      await requestWakeLock()
    }
  })
  
  // Initialize update system
  await getCurrentVersion()
  await checkForUpdates()
  startPeriodicUpdateCheck()

  // Listen for update completion events
  window.addEventListener('update-completed', (event: any) => {
    updateResult.value = event.detail
    isUpdating.value = false
  })
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('keydown', handleKeyDown)
  releaseWakeLock()
  stopPeriodicUpdateCheck()
})

// Handle Delete key press
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Delete' && selectedButton.value !== null) {
    event.preventDefault()
    deleteButton(selectedButton.value)
  }
  
  // Allow switching back to edit mode from deck mode with Escape key
  if (event.key === 'Escape' && appStore.mode === 'deck') {
    appStore.setMode('edit')
  }
}

// Watchers
watch(selectedButton, (newVal, oldVal) => {
  isChangingButton.value = true
  
  if (newVal === null) {
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
  
  // Allow changes after button selection is complete
  nextTick(() => {
    isChangingButton.value = false
  })
})

// Watch buttonConfig changes for auto-save
watch(buttonConfig, (newConfig, oldConfig) => {
  // Don't save if we're just changing buttons, already saving, or swapping
  if (isChangingButton.value || isSaving.value) {
    console.log('⏸️ Skipping save: isChangingButton:', isChangingButton.value, 'isSaving:', isSaving.value)
    return
  }
  
  // Only save if a button is selected
  if (selectedButton.value === null) {
    console.log('⏸️ Skipping save: no button selected')
    return
  }
  
  // Check if there are actual changes (but allow first save after selection)
  if (oldConfig) {
    const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(oldConfig)
    if (!hasChanges) {
      console.log('⏸️ Skipping save: no changes detected')
      return
    }
  }
  
  console.log('🔄 ButtonConfig changed, scheduling save...', {
    label: newConfig.label,
    emoji: newConfig.emoji,
    actionsCount: newConfig.actions.length
  })
  debouncedSave()
}, { deep: true, flush: 'post' })
</script>

