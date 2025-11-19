<template>
  <div :class="[
    'flex flex-col relative',
    props.mode === 'edit' ? 'flex-1 p-8 items-center justify-center gap-4' : 'h-full w-full items-center justify-center'
  ]">
    <!-- Exit Deck Mode Button - Only in Deck Mode -->
    <button
      v-if="props.mode === 'deck'"
      @click="$emit('mode-change', 'edit')"
      class="absolute top-4 right-4 z-50 btn btn-circle btn-primary btn-sm shadow-lg"
      :title="t('streamDeckGrid.exitDeckMode')"
    >
      <Edit :size="16" />
    </button>
    <!-- Grid Size Controls - Only in Edit Mode -->
    <div v-if="props.mode === 'edit'" class="flex items-center gap-3">
      <span class="text-sm font-medium text-base-content/70">{{ t('streamDeckGrid.gridSize') }}</span>
      
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('grid-size-change', -1, 0)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridCols <= 3"
          :title="t('streamDeckGrid.reduceColumns')"
        >
          <Minus :size="14" />
        </button>
        <span class="text-sm font-mono min-w-12 text-center">{{ gridCols }}×{{ gridRows }}</span>
        <button 
          @click="$emit('grid-size-change', 1, 0)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridCols >= 8"
          :title="t('streamDeckGrid.increaseColumns')"
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
          :title="t('streamDeckGrid.reduceRows')"
        >
          <Minus :size="14" />
        </button>
        <button 
          @click="$emit('grid-size-change', 0, 1)" 
          class="btn btn-ghost btn-xs btn-square"
          :disabled="gridRows >= 6"
          :title="t('streamDeckGrid.increaseRows')"
        >
          <Plus :size="14" />
        </button>
      </div>
    </div>

    <div
      ref="container"
      data-swapy-container
      :class="[
        'grid bg-base-300 rounded-2xl border-2 border-base-300',
        props.mode === 'edit' ? 'gap-2 p-4' : 'gap-4 p-8 h-full w-full aspect-square max-w-full max-h-full'
      ]"
      :style="{ 
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)` 
      }"
    >
      <div
        v-for="index in (gridCols * gridRows)"
        :key="`slot-${index - 1}`"
        :data-swapy-slot="`slot-${index - 1}`"
        :class="[
          'slot-container flex items-center justify-center',
          props.mode === 'edit' ? 'w-20 h-20' : 'w-full h-full'
        ]"
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
              'w-full h-full border-2 transition-all duration-200 relative',
              'flex flex-col items-center justify-center',
              props.mode === 'edit' ? 'gap-1' : 'gap-2',
              props.mode === 'edit' ? 'rounded-xl p-2' : 'rounded-2xl p-3',
              selectedButton === (index - 1) ? 'border-primary bg-primary/20' : 'border-base-content/20 bg-base-100',
              'hover:border-primary/50 cursor-grab active:cursor-grabbing',
              executingButtons.includes(index - 1) ? 'animate-pulse bg-success/20 border-success' : '',
            ]"
            :style="getButtonStyle(index - 1)"
            :data-cy="`button-slot`"
          >
            <!-- Content for buttons with data -->
            <template v-if="getButton(index - 1)">
              <!-- Top Text -->
              <div 
                v-if="getButtonData(index - 1)?.textTop"
                :class="[
                  'font-medium text-center leading-tight w-full',
                  props.mode === 'edit' ? 'text-xs' : 'text-sm'
                ]"
                :style="{ fontSize: (getButtonData(index - 1)?.fontSize || (props.mode === 'edit' ? 14 : 18)) + 'px' }"
              >
                {{ getButtonData(index - 1).textTop }}
              </div>
              
              <!-- Icon (lucide) or Emoji or Dynamic Value -->
              <div :class="[
                'flex items-center justify-center',
                props.mode === 'edit' ? 'text-2xl' : 'text-4xl'
              ]">
                <!-- Show dynamic value if available (any plugin with dynamic actions) -->
                <span v-if="getButtonData(index - 1)?.dynamicValue" :class="[
                  'font-mono',
                  props.mode === 'edit' ? 'text-lg' : 'text-xl'
                ]">
                  {{ getButtonData(index - 1).dynamicValue }}
                </span>
                <!-- Otherwise show icon or emoji -->
                <component 
                  v-else-if="getButtonData(index - 1)?.icon" 
                  :is="getLucideIcon(getButtonData(index - 1)?.icon)"
                  :size="props.mode === 'edit' ? 32 : 48"
                />
                <span v-else-if="getButtonData(index - 1)?.emoji">{{ getButtonData(index - 1).emoji }}</span>
                <span v-else-if="selectedButton === (index - 1)" class="opacity-50">⚡</span>
                <span v-else>⚡</span>
              </div>
              
              <!-- Bottom Text -->
              <div 
                v-if="getButtonData(index - 1)?.textBottom"
                :class="[
                  'font-medium text-center leading-tight w-full',
                  props.mode === 'edit' ? 'text-xs' : 'text-sm'
                ]"
                :style="{ fontSize: (getButtonData(index - 1)?.fontSize || (props.mode === 'edit' ? 14 : 18)) + 'px' }"
              >
                {{ getButtonData(index - 1).textBottom }}
              </div>
              
              <!-- Action Count -->
              <div 
                v-if="getButtonData(index - 1)?.actions?.length" 
                :class="[
                  'bg-primary text-primary-content rounded-full text-xs flex items-center justify-center font-bold absolute -top-1 -right-1',
                  props.mode === 'edit' ? 'w-5 h-5' : 'w-6 h-6 text-sm'
                ]"
              >
                {{ getButtonData(index - 1)?.actions?.length || 0 }}
              </div>
              
              <!-- Execution Feedback -->
              <div 
                v-if="executingButtons.includes(index - 1)" 
                :class="[
                  'bg-warning text-warning-content rounded-full text-sm flex items-center justify-center font-bold animate-pulse absolute -bottom-1 -right-1',
                  props.mode === 'edit' ? 'w-6 h-6' : 'w-8 h-8'
                ]"
                data-cy="execution-feedback"
              >
                ⚡
              </div>
            </template>
            
            <!-- Content for empty slots -->
            <template v-else>
              <!-- Show live preview if this slot is selected and has content -->
              <template v-if="selectedButton === (index - 1) && (buttonConfig.textTop || buttonConfig.textBottom || buttonConfig.label || buttonConfig.icon || buttonConfig.emoji || buttonConfig.actions.length)">
                <!-- Top Text -->
                <div 
                  v-if="buttonConfig.textTop"
                  :class="[
                    'font-medium text-center leading-tight w-full',
                    props.mode === 'edit' ? 'text-xs' : 'text-sm'
                  ]"
                  :style="{ fontSize: (buttonConfig.fontSize || (props.mode === 'edit' ? 14 : 18)) + 'px' }"
                >
                  {{ buttonConfig.textTop }}
                </div>
                
                <!-- Icon or Emoji -->
                <div :class="[
                  'flex items-center justify-center',
                  props.mode === 'edit' ? 'text-2xl' : 'text-4xl'
                ]">
                  <component 
                    v-if="buttonConfig.icon" 
                    :is="getLucideIcon(buttonConfig.icon)"
                    :size="props.mode === 'edit' ? 32 : 48"
                  />
                  <span v-else-if="buttonConfig.emoji">{{ buttonConfig.emoji }}</span>
                  <span v-else class="opacity-50">⚡</span>
                </div>
                
                <!-- Bottom Text -->
                <div 
                  v-if="buttonConfig.textBottom"
                  :class="[
                    'font-medium text-center leading-tight w-full',
                    props.mode === 'edit' ? 'text-xs' : 'text-sm'
                  ]"
                  :style="{ fontSize: (buttonConfig.fontSize || (props.mode === 'edit' ? 14 : 18)) + 'px' }"
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
                <div :class="[
                  'opacity-50',
                  props.mode === 'edit' ? 'text-2xl' : 'text-4xl'
                ]">
                  <Plus :size="props.mode === 'edit' ? 24 : 36" />
                </div>
                <div :class="[
                  'opacity-50',
                  props.mode === 'edit' ? 'text-xs' : 'text-sm'
                ]">{{ index }}</div>
              </template>
            </template>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Context Menu -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @item-click="handleContextMenuItem"
      @close="hideContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { createSwapy, type Swapy } from 'swapy'
import { Plus, Play, Trash2, Minus, Edit } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import ContextMenu from './ContextMenu.vue'
import { useI18nStore } from '../composables/useI18n'
import type { ButtonData, ButtonEntity } from '../types/streamdeck'

const { t } = useI18nStore()

interface Props {
  gridCols: number
  gridRows: number
  selectedButton: number | null
  executingButtons: number[]
  buttonConfig: ButtonData
  getButton: (position: number) => ButtonEntity | undefined
  getButtonData: (position: number) => any
  getButtonStyle: (position: number) => any
  mode: 'edit' | 'deck'
}

interface Emits {
  (e: 'button-click', position: number): void
  (e: 'button-execute', position: number): void
  (e: 'button-delete', position: number): void
  (e: 'swap', event: any): void
  (e: 'grid-size-change', deltaX: number, deltaY: number): void
  (e: 'mode-change', mode: 'edit' | 'deck'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Swapy instance
const container = ref<HTMLElement | null>(null)
const swapy = ref<Swapy | null>(null)

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  position: -1
})

// Context menu items
const contextMenuItems = computed(() => {
  const button = props.getButton(contextMenu.value.position)
  
  if (button) {
    // Menu for existing buttons
    return [
      {
        id: 'execute',
        label: t('streamDeckGrid.press'),
        icon: Play,
        danger: false
      },
      {
        id: 'delete',
        label: t('streamDeckGrid.delete'),
        icon: Trash2,
        danger: true
      }
    ]
  } else {
    // Menu for empty slots
    return [
      {
        id: 'create',
        label: t('streamDeckGrid.createButton'),
        icon: Plus,
        danger: false
      }
    ]
  }
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

// Handle context menu item click
const handleContextMenuItem = (item: any) => {
  switch (item.id) {
    case 'execute':
      emit('button-execute', contextMenu.value.position)
      break
    case 'delete':
      emit('button-delete', contextMenu.value.position)
      break
    case 'create':
      emit('button-click', contextMenu.value.position)
      break
  }
  hideContextMenu()
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
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  swapy.value?.destroy()
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