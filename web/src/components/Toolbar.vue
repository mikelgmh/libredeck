<template>
  <div class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <!-- Mode Toggle Buttons -->
        <div class="join join-vertical lg:join-horizontal">
          <button 
            @click="$emit('mode-changed', 'edit')"
            :class="[
              'btn join-item btn-sm',
              currentMode === 'edit' ? 'btn-primary' : 'btn-ghost'
            ]"
            :title="t('toolbar.editMode')"
          >
            <Edit :size="16" />
            <span class="hidden sm:inline ml-1">{{ t('toolbar.edit') }}</span>
          </button>
          <button 
            @click="$emit('mode-changed', 'deck')"
            :class="[
              'btn join-item btn-sm',
              currentMode === 'deck' ? 'btn-primary' : 'btn-ghost'
            ]"
            :title="t('toolbar.deckMode')"
          >
            <Grid3x3 :size="16" />
            <span class="hidden sm:inline ml-1">{{ t('toolbar.deck') }}</span>
          </button>
        </div>

        <select 
          :value="selectedProfile" 
          @change="handleProfileChange" 
          class="select select-bordered select-sm"
          data-cy="profile-selector"
        >
          <option value="">{{ t('toolbar.selectProfile') }}</option>
          <option v-for="profile in profiles" :key="profile.id" :value="profile.id" data-cy="profile-option">
            {{ profile.name }}
          </option>
        </select>
        <button 
          @click="$emit('show-profile-settings')"
          class="btn btn-ghost btn-sm btn-square"
          :title="t('toolbar.profileSettings')"
        >
          <Settings :size="20" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <select 
          :value="currentLocale" 
          @change="handleLanguageChange" 
          class="select select-bordered select-sm"
          :title="t('toolbar.language')"
          data-cy="language-selector"
        >
          <option value="es">🇪🇸 Español</option>
          <option value="en" data-cy="language-en">🇺🇸 English</option>
        </select>
        
        <button 
          @click="$emit('show-qr')"
          class="btn btn-ghost btn-sm btn-square"
          :title="t('toolbar.showQR')"
        >
          <QrCode :size="20" />
        </button>
        
        <button 
          v-if="!isIPhone"
          @click="toggleFullscreen"
          class="btn btn-ghost btn-sm btn-square"
          :title="isFullscreen ? t('toolbar.exitFullscreen') : t('toolbar.fullscreen')"
        >
          <Maximize2 v-if="!isFullscreen" :size="20" />
          <Minimize2 v-else :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { QrCode, Maximize2, Minimize2, Settings, Edit, Grid3x3 } from 'lucide-vue-next'
import { useI18nStore } from '../composables/useI18n'
import type { ProfileData } from '../types/streamdeck'

const { t } = useI18nStore()

interface Props {
  profiles: ProfileData[]
  selectedProfile: string
  gridCols: number
  gridRows: number
  currentLocale: string
  currentMode: 'edit' | 'deck'
}

interface Emits {
  (e: 'profile-changed', profileId: string): void
  (e: 'grid-size-change', deltaX: number, deltaY: number): void
  (e: 'show-qr'): void
  (e: 'show-profile-settings'): void
  (e: 'language-changed', locale: string): void
  (e: 'mode-changed', mode: 'edit' | 'deck'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isFullscreen = ref(false)
const isIPhone = ref(false)

const handleLanguageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('language-changed', target.value)
}

const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('Error al cambiar pantalla completa:', error)
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  // Detectar si es iPhone
  const userAgent = window.navigator.userAgent.toLowerCase()
  isIPhone.value = /iphone/.test(userAgent)
  
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>