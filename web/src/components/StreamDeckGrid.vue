<template>
  <div class="flex-1 p-8 flex flex-col items-center justify-center gap-4">
    <!-- Grid Size Controls -->
    <div class="flex items-center gap-3">
      <span class="text-sm font-medium text-base-content/70">Tamaño de cuadrícula:</span>
      
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('grid-size-change', -1, 0)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridCols <= 3"
          title="Reducir columnas"
        >
          <Minus :size="14" />
        </button>
        <span class="text-sm font-mono min-w-[3rem] text-center">{{ gridCols }}×{{ gridRows }}</span>
        <button 
          @click="$emit('grid-size-change', 1, 0)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridCols >= 8"
          title="Aumentar columnas"
        >
          <Plus :size="14" />
        </button>
      </div>
      
      <div class="divider divider-horizontal mx-0"></div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('grid-size-change', 0, -1)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridRows <= 2"
          title="Reducir filas"
        >
          <Minus :size="14" />
        </button>
        <button 
          @click="$emit('grid-size-change', 0, 1)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridRows >= 6"
          title="Aumentar filas"
        >
          <Plus :size="14" />
        </button>
      </div>
    </div>

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
        @contextmenu.prevent.stop="showContextMenu($event, index - 1)"
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
              <!-- Top Text -->
              <div 
                v-if="getButtonData(index - 1)?.textTop"
                class="text-xs font-medium text-center leading-tight w-full"
                :style="{ fontSize: (getButtonData(index - 1)?.fontSize || 14) + 'px' }"
              >
                {{ getButtonData(index - 1).textTop }}
              </div>
              
              <!-- Icon (lucide) or Emoji -->
              <div class="text-2xl flex items-center justify-center">
                <component 
                  v-if="getButtonData(index - 1)?.icon" 
                  :is="getLucideIcon(getButtonData(index - 1)?.icon)"
                  :size="32"
                />
                <span v-else-if="getButtonData(index - 1)?.emoji">{{ getButtonData(index - 1).emoji }}</span>
                <span v-else-if="selectedButton === (index - 1)" class="opacity-50">⚡</span>
                <span v-else>⚡</span>
              </div>
              
              <!-- Bottom Text -->
              <div 
                v-if="getButtonData(index - 1)?.textBottom"
                class="text-xs font-medium text-center leading-tight w-full"
                :style="{ fontSize: (getButtonData(index - 1)?.fontSize || 14) + 'px' }"
              >
                {{ getButtonData(index - 1).textBottom }}
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
              <template v-if="selectedButton === (index - 1) && (buttonConfig.textTop || buttonConfig.textBottom || buttonConfig.label || buttonConfig.icon || buttonConfig.emoji || buttonConfig.actions.length)">
                <!-- Top Text -->
                <div 
                  v-if="buttonConfig.textTop"
                  class="text-xs font-medium text-center leading-tight w-full"
                  :style="{ fontSize: (buttonConfig.fontSize || 14) + 'px' }"
                >
                  {{ buttonConfig.textTop }}
                </div>
                
                <!-- Icon or Emoji -->
                <div class="text-2xl flex items-center justify-center">
                  <component 
                    v-if="buttonConfig.icon" 
                    :is="getLucideIcon(buttonConfig.icon)"
                    :size="32"
                  />
                  <span v-else-if="buttonConfig.emoji">{{ buttonConfig.emoji }}</span>
                  <span v-else class="opacity-50">⚡</span>
                </div>
                
                <!-- Bottom Text -->
                <div 
                  v-if="buttonConfig.textBottom"
                  class="text-xs font-medium text-center leading-tight w-full"
                  :style="{ fontSize: (buttonConfig.fontSize || 14) + 'px' }"
                >
                  {{ buttonConfig.textBottom }}
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
    
    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      ref="contextMenuRef"
      class="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 z-[9999]"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <button
        v-if="getButton(contextMenu.position)"
        @click="handleExecute"
        class="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2 text-sm"
      >
        <Play :size="16" />
        Pulsar
      </button>
      <button
        v-if="getButton(contextMenu.position)"
        @click="handleDelete"
        class="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2 text-sm text-error"
      >
        <Trash2 :size="16" />
        Eliminar
      </button>
      <div v-if="!getButton(contextMenu.position)" class="px-4 py-2 text-sm text-base-content/50">
        Botón vacío
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createSwapy, type Swapy } from 'swapy'
import { Plus, Play, Trash2, Minus } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
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
  (e: 'button-delete', position: number): void
  (e: 'swap', event: any): void
  (e: 'grid-size-change', deltaX: number, deltaY: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Swapy instance
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)
const contextMenuRef = ref<HTMLElement | null>(null)

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  position: -1
})

// Get Lucide icon component by name
const getLucideIcon = (iconName: string) => {
  const icons = LucideIcons as Record<string, any>
  return icons[iconName] || Plus
}

// Show context menu
const showContextMenu = (event: MouseEvent, position: number) => {
  event.preventDefault()
  
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    position
  }
}

// Hide context menu
const hideContextMenu = () => {
  contextMenu.value.show = false
}

// Handle execute button
const handleExecute = () => {
  emit('button-execute', contextMenu.value.position)
  hideContextMenu()
}

// Handle delete button
const handleDelete = () => {
  emit('button-delete', contextMenu.value.position)
  hideContextMenu()
}

// Close context menu on click outside
const handleClickOutside = (event: MouseEvent) => {
  if (contextMenu.value.show && contextMenuRef.value && !contextMenuRef.value.contains(event.target as Node)) {
    hideContextMenu()
  }
}

// Close context menu on Escape key
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && contextMenu.value.show) {
    hideContextMenu()
  }
}

// Initialize Swapy
const initializeSwapy = () => {
  if (container.value) {
    swapy.value = createSwapy(container.value, {
      animation: 'dynamic'
    })

    // Usar onSwapEnd en lugar de onSwap para emitir solo cuando termina el drag
    swapy.value.onSwapEnd(event => {
      console.log('🔄 Swap ended', event)
      emit('swap', event)
    })
  }
}

onMounted(() => {
  initializeSwapy()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  swapy.value?.destroy()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
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