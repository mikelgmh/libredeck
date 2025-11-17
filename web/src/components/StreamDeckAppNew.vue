<template>
  <div class="flex h-screen bg-base-100 text-base-content">
    <!-- Sidebar -->
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
        @swap="handleSwap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useStreamDeck } from '../composables/useStreamDeck'
import Sidebar from './Sidebar.vue'
import Toolbar from './Toolbar.vue'
import StreamDeckGrid from './StreamDeckGrid.vue'

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

const updateButtonLabel = (value: string) => {
  buttonConfig.value.label = value
}

const updateButtonEmoji = (value: string) => {
  buttonConfig.value.emoji = value
}

const updateButtonBackgroundColor = (value: string) => {
  buttonConfig.value.backgroundColor = value
}

const updateButtonTextColor = (value: string) => {
  buttonConfig.value.textColor = value
}

// Lifecycle
onMounted(() => {
  connectWebSocket()
  loadProfiles()
})

onUnmounted(() => {
  cleanup()
})

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
  if (selectedButton.value !== null && !isChangingButton.value && !isSaving.value && oldConfig) {
    // Only save if there are actual meaningful changes
    const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(oldConfig)
    if (hasChanges) {
      console.log('ButtonConfig changed, saving...', newConfig)
      debouncedSave()
    }
  }
}, { deep: true, flush: 'post' })
</script>

