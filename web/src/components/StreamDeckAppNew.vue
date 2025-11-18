<template>
  <div class="flex h-screen bg-base-100 text-base-content">
    <!-- Sidebar Izquierdo -->
    <Sidebar
      :connectionStatus="connectionStatus"
      :connectionText="connectionText"
      :profiles="profiles"
      :selectedProfile="selectedProfile"
      :selectedButton="selectedButton"
      :buttonConfig="buttonConfig"
      :plugins="plugins"
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
      @update-action-parameter="(args) => updateActionParameter(args[0], args[1], args[2])"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Toolbar -->
      <Toolbar
        :currentProfile="currentProfile"
        :gridCols="gridCols"
        :gridRows="gridRows"
        @grid-size-change="changeGridSize"
        @show-qr="showQRModal"
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
        @button-click="selectButton"
        @button-execute="executeButton"
        @button-delete="deleteButton"
        @swap="handleSwap"
        @grid-size-change="changeGridSize"
      />
    </div>

    <!-- Sidebar Derecho - Biblioteca de Acciones -->
    <ActionsRightSidebar />
    
    <!-- QR Modal -->
    <QRModal ref="qrModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useStreamDeck } from '../composables/useStreamDeck'
import Sidebar from './Sidebar.vue'
import Toolbar from './Toolbar.vue'
import StreamDeckGrid from './StreamDeckGrid.vue'
import ActionsRightSidebar from './ActionsRightSidebar.vue'
import QRModal from './QRModal.vue'

// QR Modal ref
const qrModal = ref<InstanceType<typeof QRModal> | null>(null)

const showQRModal = () => {
  qrModal.value?.showModal()
}

// Wake Lock API to keep screen awake
let wakeLock: any = null

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen')
      console.log('✅ Screen Wake Lock activado')
      
      wakeLock.addEventListener('release', () => {
        console.log('⚠️ Screen Wake Lock liberado')
      })
    }
  } catch (err) {
    console.error('❌ Error al activar Wake Lock:', err)
  }
}

const releaseWakeLock = async () => {
  if (wakeLock !== null) {
    try {
      await wakeLock.release()
      wakeLock = null
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
  getButton,
  selectButton,
  executeButton,
  deleteButton,
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
  saveTimeout
} = useStreamDeck()

// Event handlers for child components
const handleProfileChange = (profileId: string) => {
  selectedProfile.value = profileId
}

const handleProfileCreate = async (name: string) => {
  await createProfile(name)
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
  connectWebSocket()
  loadProfiles()
  
  // Add keyboard listener for Delete key
  window.addEventListener('keydown', handleKeyDown)
  
  // Activar Wake Lock para mantener pantalla encendida
  await requestWakeLock()
  
  // Reactivar Wake Lock si la página vuelve a ser visible
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wakeLock === null) {
      await requestWakeLock()
    }
  })
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('keydown', handleKeyDown)
  releaseWakeLock()
})

// Handle Delete key press
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Delete' && selectedButton.value !== null) {
    event.preventDefault()
    deleteButton(selectedButton.value)
  }
}

// Watchers
watch(selectedProfile, (newProfileId) => {
  if (newProfileId) {
    loadProfile()
  }
})

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

