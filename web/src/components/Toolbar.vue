<template>
  <div class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <select 
          :value="selectedProfile" 
          @change="handleProfileChange" 
          class="select select-bordered select-sm"
        >
          <option value="">Seleccionar perfil...</option>
          <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
            {{ profile.name }}
          </option>
        </select>
        <button 
          @click="$emit('show-profile-settings')"
          class="btn btn-ghost btn-sm btn-square"
          title="Ajustes de perfiles"
        >
          <Settings :size="20" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('show-qr')"
          class="btn btn-ghost btn-sm btn-square"
          title="Mostrar código QR"
        >
          <QrCode :size="20" />
        </button>
        
        <button 
          v-if="!isIPhone"
          @click="toggleFullscreen"
          class="btn btn-ghost btn-sm btn-square"
          :title="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'"
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
import { QrCode, Maximize2, Minimize2, Settings } from 'lucide-vue-next'
import type { ProfileData } from '../types/streamdeck'

interface Props {
  profiles: ProfileData[]
  selectedProfile: string
  gridCols: number
  gridRows: number
}

interface Emits {
  (e: 'profile-changed', profileId: string): void
  (e: 'grid-size-change', deltaX: number, deltaY: number): void
  (e: 'show-qr'): void
  (e: 'show-profile-settings'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isFullscreen = ref(false)
const isIPhone = ref(false)

const handleProfileChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('profile-changed', target.value)
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