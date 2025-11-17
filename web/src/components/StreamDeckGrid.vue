<template>
  <div class="flex-1 p-8 flex items-center justify-center">
    <div
      ref="container"
      data-swapy-container
      class="grid gap-2 p-4 bg-base-300 rounded-2xl border-2 border-base-300"
      :style="{ 
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)` 
      }"
    >
      <div
        v-for="index in (gridCols * gridRows)"
        :key="`slot-${index - 1}`"
        :data-swapy-slot="`slot-${index - 1}`"
        class="slot-container w-20 h-20 flex items-center justify-center"
      >
        <div 
          :data-swapy-item="getButton(index - 1) ? `item-${getButton(index - 1)!.id}` : `empty-${index - 1}`"
          class="w-full h-full"
        >
          <button
            @click="$emit('button-click', index - 1)"
            @dblclick="$emit('button-execute', index - 1)"
            :class="[
              'deck-button',
              'w-full h-full rounded-xl border-2 transition-all duration-200 relative',
              'flex flex-col items-center justify-center gap-1 p-2',
              selectedButton === (index - 1) ? 'border-primary bg-primary/20' : 'border-base-content/20 bg-base-100',
              'hover:border-primary/50 cursor-grab active:cursor-grabbing',
              executingButtons.includes(index - 1) ? 'animate-pulse bg-success/20 border-success' : '',
            ]"
            :style="getButtonStyle(index - 1)"
          >
            <!-- Content for buttons with data -->
            <template v-if="getButton(index - 1)">
              <!-- Icon/Emoji -->
              <div class="text-2xl">
                <span v-if="getButtonData(index - 1)?.emoji">{{ getButtonData(index - 1).emoji }}</span>
                <span v-else-if="selectedButton === (index - 1)" class="opacity-50">⚡</span>
                <span v-else>⚡</span>
              </div>
              
              <!-- Label -->
              <div class="text-xs font-medium text-center leading-tight truncate w-full">
                <span v-if="getButtonData(index - 1)?.label">{{ getButtonData(index - 1).label }}</span>
                <span v-else-if="selectedButton === (index - 1)" class="opacity-50 text-xs">Escribe un texto...</span>
              </div>
              
              <!-- Action Count -->
              <div 
                v-if="getButtonData(index - 1)?.actions?.length" 
                class="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-content rounded-full text-xs flex items-center justify-center font-bold"
              >
                {{ getButtonData(index - 1)?.actions?.length || 0 }}
              </div>
            </template>
            
            <!-- Content for empty slots -->
            <template v-else>
              <!-- Show live preview if this slot is selected and has content -->
              <template v-if="selectedButton === (index - 1) && (buttonConfig.label || buttonConfig.emoji || buttonConfig.actions.length)">
                <div class="text-2xl">
                  <span v-if="buttonConfig.emoji">{{ buttonConfig.emoji }}</span>
                  <span v-else class="opacity-50">⚡</span>
                </div>
                <div class="text-xs font-medium text-center leading-tight truncate w-full">
                  <span v-if="buttonConfig.label">{{ buttonConfig.label }}</span>
                  <span v-else class="opacity-50">Escribe un texto...</span>
                </div>
                <div 
                  v-if="buttonConfig.actions?.length" 
                  class="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-content rounded-full text-xs flex items-center justify-center font-bold"
                >
                  {{ buttonConfig.actions.length }}
                </div>
              </template>
              
              <!-- Default empty state -->
              <template v-else>
                <div class="text-2xl opacity-50">
                  <Plus :size="24" />
                </div>
                <div class="text-xs opacity-50">{{ index }}</div>
              </template>
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createSwapy, type Swapy } from 'swapy'
import { Plus } from 'lucide-vue-next'
import type { ButtonData, ButtonEntity } from '../types/streamdeck'

interface Props {
  gridCols: number
  gridRows: number
  selectedButton: number | null
  executingButtons: number[]
  buttonConfig: ButtonData
  getButton: (position: number) => ButtonEntity | undefined
  getButtonData: (position: number) => any
  getButtonStyle: (position: number) => any
}

interface Emits {
  (e: 'button-click', position: number): void
  (e: 'button-execute', position: number): void
  (e: 'swap', event: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Swapy instance
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)

// Initialize Swapy
const initializeSwapy = () => {
  if (container.value) {
    swapy.value = createSwapy(container.value)

    swapy.value.onSwap(event => {
      console.log('swap', event)
      emit('swap', event)
    })
  }
}

onMounted(() => {
  initializeSwapy()
})

onUnmounted(() => {
  swapy.value?.destroy()
})
</script>

<style scoped>
/* Swapy drag & drop styles */
.deck-button {
  transition: all 0.2s ease;
  user-select: none;
}

.deck-button:active {
  transform: scale(0.95);
}

.slot-container {
  position: relative;
  transition: all 0.2s ease;
}
</style>

<style>
/* Global Swapy styles - must be unscoped */
[data-swapy-item] {
  cursor: grab;
}

[data-swapy-item]:active {
  cursor: grabbing;
}

[data-swapy-item].swapy-item-dragging {
  opacity: 0.9 !important;
  z-index: 1000 !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
  transition: none !important;
}

[data-swapy-slot].swapy-slot-over {
  background: linear-gradient(45deg, rgba(74, 222, 128, 0.1), rgba(34, 197, 94, 0.1)) !important;
  border: 2px dashed rgba(34, 197, 94, 0.6) !important;
  border-radius: 0.75rem !important;
  transform: scale(1.02) !important;
}

[data-swapy-container] {
  position: relative;
}

[data-swapy-slot] {
  border-radius: 0.75rem;
  transition: all 0.2s ease;
  position: relative;
}

/* Dragging cursor for the entire container */
[data-swapy-container].swapy-container-dragging {
  cursor: grabbing;
}

/* Disable transitions during drag to prevent visual glitches */
[data-swapy-container].swapy-container-dragging .slot-container {
  transition: none !important;
}

[data-swapy-container].swapy-container-dragging .deck-button {
  transition: none !important;
}

/* Improve visual feedback during drag */
[data-swapy-slot]:not(.swapy-slot-over) {
  opacity: 1;
}

.swapy-container-dragging [data-swapy-slot]:not(.swapy-slot-over) {
  opacity: 0.7;
}
</style>