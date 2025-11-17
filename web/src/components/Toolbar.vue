<template>
  <div class="bg-base-200 border-b border-base-300 p-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <h2 class="text-lg font-semibold">
          {{ currentProfile ? currentProfile.name : 'Selecciona un perfil' }}
        </h2>
        <div class="badge badge-outline">
          {{ gridCols }}x{{ gridRows }}
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Grid Size Controls -->
        <div class="join">
          <button 
            @click="$emit('grid-size-change', -1, 0)" 
            class="btn btn-outline btn-sm join-item"
            :disabled="gridCols <= 3"
          >
            <Minus :size="16" />
          </button>
          <button class="btn btn-ghost btn-sm join-item pointer-events-none">
            {{ gridCols }}×{{ gridRows }}
          </button>
          <button 
            @click="$emit('grid-size-change', 1, 0)" 
            class="btn btn-outline btn-sm join-item"
            :disabled="gridCols >= 8"
          >
            <Plus :size="16" />
          </button>
        </div>
        
        <div class="join">
          <button 
            @click="$emit('grid-size-change', 0, -1)" 
            class="btn btn-outline btn-sm join-item"
            :disabled="gridRows <= 2"
          >
            <Minus :size="16" />
          </button>
          <button 
            @click="$emit('grid-size-change', 0, 1)" 
            class="btn btn-outline btn-sm join-item"
            :disabled="gridRows >= 6"
          >
            <Plus :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Minus } from 'lucide-vue-next'
import type { ProfileData } from '../types/streamdeck'

interface Props {
  currentProfile: ProfileData | null
  gridCols: number
  gridRows: number
}

interface Emits {
  (e: 'grid-size-change', deltaX: number, deltaY: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>