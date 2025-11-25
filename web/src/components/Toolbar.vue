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
          v-model="selectedStreamDeck" 
          @change="handleStreamDeckChange" 
          class="select select-bordered select-sm"
          :title="t('toolbar.streamDeck')"
          data-cy="streamdeck-selector"
        >
          <option value="">{{ t('toolbar.selectStreamDeck') }}</option>
          <option v-for="device in streamDeckDevices" :key="device.path" :value="device.path">
            {{ device.model }} ({{ device.path }})
          </option>
        </select>
        
        <button 
          @click="testStreamDeck"
          class="btn btn-ghost btn-sm btn-square"
          :title="'Test StreamDeck Colors'"
          :disabled="!selectedStreamDeck"
        >
          🎨
        </button>
        
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
          @click="$emit('check-updates')"
          class="btn btn-ghost btn-sm btn-square"
          :title="t('toolbar.checkUpdates')"
        >
          <Download :size="20" />
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
import { QrCode, Maximize2, Minimize2, Settings, Edit, Grid3x3, Download } from 'lucide-vue-next'
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
  (e: 'check-updates'): void
  (e: 'streamdeck-connected'): void
  (e: 'streamdeck-disconnected'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isFullscreen = ref(false)
const isIPhone = ref(false)
const streamDeckDevices = ref<any[]>([])
const selectedStreamDeck = ref('')

// Get dynamic base URLs based on current host
const config = ref({ wsPort: 3002, apiPort: 3001, frontendPort: 4321 });

const loadConfig = async () => {
  try {
    // En modo dev, hacer fetch al daemon directamente
    const configUrl = typeof window !== 'undefined' && window.location.port !== '3001'
      ? 'http://localhost:3001/config'
      : '/config';
    const res = await fetch(configUrl);
    const data = await res.json();
    config.value = data;
    console.log('🔧 Loaded config:', config.value);
  } catch (e) {
    console.error('Failed to load config', e);
  }
};

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:${config.value.apiPort}/api/v1`
  }
  return 'http://localhost:3001/api/v1'
}

const handleProfileChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('profile-changed', target.value)
}

const handleStreamDeckChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  const devicePath = target.value

  if (devicePath) {
    try {
      const response = await fetch(`${getApiBase()}/devices/streamdeck/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ devicePath })
      })

      const result = await response.json()
      if (result.success) {
        console.log('✅ Connected to StreamDeck:', result.connectedDevice)
        selectedStreamDeck.value = devicePath
        console.log('📡 Emitting streamdeck-connected event...')
        emit('streamdeck-connected')
      } else {
        console.error('❌ Failed to connect to StreamDeck')
        selectedStreamDeck.value = ''
      }
    } catch (error) {
      console.error('Error connecting to StreamDeck:', error)
      selectedStreamDeck.value = ''
    }
  } else {
    // Disconnect
    try {
      await fetch(`${getApiBase()}/devices/streamdeck/disconnect`, {
        method: 'POST'
      })
      console.log('Disconnected from StreamDeck')
      selectedStreamDeck.value = ''
      emit('streamdeck-disconnected')
    } catch (error) {
      console.error('Error disconnecting from StreamDeck:', error)
    }
  }
}

const testStreamDeck = async () => {
  try {
    console.log('🧪 Testing StreamDeck colors...')
    const response = await fetch(`${getApiBase()}/devices/streamdeck/test`, {
      method: 'POST'
    })
    if (response.ok) {
      console.log('✅ StreamDeck test completed')
    } else {
      console.error('❌ StreamDeck test failed')
    }
  } catch (error) {
    console.error('❌ Error testing StreamDeck:', error)
  }
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

  // Load config and then StreamDeck devices
  loadConfig().then(() => {
    loadStreamDeckDevices()
  })
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>