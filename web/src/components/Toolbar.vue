<template>
  <div class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <button 
          @click="$emit('show-qr')"
          class="btn btn-ghost btn-sm btn-square"
          title="Mostrar código QR"
        >
          <QrCode :size="20" />
        </button>
        
        <h2 class="text-lg font-semibold">
          {{ currentProfile ? currentProfile.name : 'Selecciona un perfil' }}
        </h2>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QrCode } from 'lucide-vue-next'
import type { ProfileData } from '../types/streamdeck'

interface Props {
  currentProfile: ProfileData | null
  gridCols: number
  gridRows: number
}

interface Emits {
  (e: 'grid-size-change', deltaX: number, deltaY: number): void
  (e: 'show-qr'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>