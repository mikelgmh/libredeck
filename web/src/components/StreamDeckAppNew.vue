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

const showQRModal = () => {
  qrModal.value?.showModal()
}

const showProfileSettingsModal = () => {
  profileSettingsModal.value?.showModal()
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

