<template>
  <div class="space-y-4" data-cy="button-editor">
    <!-- Basic Settings -->
    <div class="space-y-4">
      <!-- Icon Picker -->
      <IconPicker
        :model-value="buttonConfig.icon || ''"
        @update:model-value="updateIcon"
      />

      <!-- Text Top -->
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">{{ t('buttonEditor.textTop') }}</span>
        </div>
        <input 
          :value="buttonConfig.textTop || ''" 
          @input="updateTextTop"
          type="text" 
          placeholder="Texto superior (opcional)"
          class="input input-bordered input-sm w-full"
          data-cy="text-top-input"
        />
      </label>

      <!-- Text Bottom -->
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">{{ t('buttonEditor.textBottom') }}</span>
        </div>
        <input 
          :value="buttonConfig.textBottom || ''" 
          @input="updateTextBottom"
          type="text" 
          placeholder="Texto inferior (opcional)"
          class="input input-bordered input-sm w-full"
          data-cy="text-bottom-input"
        />
      </label>

      <!-- Font Size -->
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">{{ t('buttonEditor.fontSize') }}</span>
        </div>
        <input 
          :value="buttonConfig.fontSize || 14" 
          @input="updateFontSize"
          type="number"
          min="8"
          max="48"
          placeholder="14"
          class="input input-bordered input-sm w-full" 
        />
      </label>

      <!-- Colors -->
      <div class="grid grid-cols-2 gap-2">
        <label class="form-control">
          <div class="label">
            <span class="label-text">{{ t('buttonEditor.backgroundColor') }}</span>
          </div>
          <input 
            :value="buttonConfig.backgroundColor" 
            @input="updateBackgroundColor"
            type="color" 
            class="input input-bordered input-sm w-full h-10" 
          />
        </label>

        <label class="form-control">
          <div class="label">
            <span class="label-text">{{ t('buttonEditor.textColor') }}</span>
          </div>
          <input 
            :value="buttonConfig.textColor" 
            @input="updateTextColor"
            type="color" 
            class="input input-bordered input-sm w-full h-10" 
          />
        </label>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="divider text-sm">{{ t('buttonEditor.actions') }}</div>
    
    <div 
      ref="actionsContainer"
      class="p-2 rounded-lg transition-all duration-200"
      :class="{
        'min-h-[100px]': !isDraggingAction,
        'min-h-[200px] bg-primary/5 border-2 border-primary border-dashed': isDraggingAction,
        'bg-primary/20': isDragOver
      }"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      data-cy="drop-zone"
    >
      <!-- Swapy container with slots -->
      <div v-if="buttonConfig.actions.length > 0" class="space-y-3" data-cy="button-actions">
        <div 
          v-for="(action, index) in buttonConfig.actions" 
          :key="action.id"
          :data-swapy-slot="action.id"
        >
          <div :data-swapy-item="action.id">
            <ActionEditor
              :action="action"
              :index="index"
              :plugins="plugins"
              :availablePages="availablePages"
              @update-parameter="(paramKey, value) => updateActionParameter(index, paramKey, value)"
              @remove="() => removeAction(index)"
            />
          </div>
        </div>
      </div>

      <!-- Drop zone hint -->
      <div v-if="!isDraggingAction" class="border-2 border-dashed border-base-content/30 rounded-lg p-4 text-center text-sm text-base-content/50 mt-4">
        {{ t('buttonEditor.dragActionsHere') }}
      </div>
      
      <div v-if="isDraggingAction" class="text-center py-12 text-sm font-medium" :class="isDragOver ? 'text-primary' : 'text-base-content/60'">
        <div class="text-2xl mb-2">↓</div>
        {{ t('buttonEditor.dropActionHere') }}
      </div>
    </div>

    <!-- Save is automatic, no manual save button needed -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18nStore } from '../composables/useI18n'
import ActionEditor from './ActionEditor.vue'
import IconPicker from './IconPicker.vue'
import type { ButtonData } from '../types/streamdeck'
import { createSwapy } from 'swapy'

const { t } = useI18nStore()

const isDragOver = ref(false)
const isDraggingAction = ref(false)
const actionsContainer = ref<HTMLElement | null>(null)
let swapyInstance: any = null

interface Props {
  buttonConfig: ButtonData
  availablePages?: Array<{ id: string; name: string }>
  plugins?: any[]
}

interface Emits {
  (e: 'update:label', value: string): void
  (e: 'update:textTop', value: string): void
  (e: 'update:textBottom', value: string): void
  (e: 'update:fontSize', value: number): void
  (e: 'update:icon', value: string): void
  (e: 'update:emoji', value: string): void
  (e: 'update:backgroundColor', value: string): void
  (e: 'update:textColor', value: string): void
  (e: 'add-action', type: string): void
  (e: 'remove-action', index: number): void
  (e: 'update-action-parameter', actionIndex: number, paramKey: string, value: any): void
  (e: 'reorder-actions', newOrderedActions: any[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateLabel = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:label', target.value)
}

const updateTextTop = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:textTop', target.value)
}

const updateTextBottom = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:textBottom', target.value)
}

const updateFontSize = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:fontSize', parseInt(target.value) || 14)
}

const updateIcon = (value: string) => {
  emit('update:icon', value)
}

const updateEmoji = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:emoji', target.value)
}

const updateBackgroundColor = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:backgroundColor', target.value)
}

const updateTextColor = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:textColor', target.value)
}

const addAction = (type: string) => {
  emit('add-action', type)
}

const removeAction = (index: number) => {
  emit('remove-action', index)
}

const updateActionParameter = (actionIndex: number, paramKey: string, value: any) => {
  emit('update-action-parameter', actionIndex, paramKey, value)
}

// Drag and drop handlers
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  isDraggingAction.value = false
  
  if (event.dataTransfer) {
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'))
      if (data.type) {
        addAction(data.type)
      }
    } catch (error) {
      console.error('Error parsing dropped data:', error)
    }
  }
}

// Global drag events
const handleGlobalDragStart = (event: DragEvent) => {
  if (event.dataTransfer?.types.includes('application/json')) {
    isDraggingAction.value = true
    if (swapyInstance) {
      swapyInstance.enable(false)
    }
  }
}

const handleGlobalDragEnd = () => {
  isDraggingAction.value = false
  isDragOver.value = false
  if (swapyInstance) {
    swapyInstance.enable(true)
  }
}

// Initialize Swapy
let isSwapping = false
let orderBeforeSwap: string[] = []

const initSwapy = async () => {
  await nextTick()
  if (actionsContainer.value && props.buttonConfig.actions.length > 0) {
    if (swapyInstance) {
      swapyInstance.destroy()
    }
    
    swapyInstance = createSwapy(actionsContainer.value, {
      animation: 'dynamic'
    })
    
    swapyInstance.onSwapStart(() => {
      isSwapping = true
      // Guardar el orden ANTES del swap
      orderBeforeSwap = props.buttonConfig.actions.map(a => a.id)
      console.log('🎬 Swap started, order before:', orderBeforeSwap)
    })
    
    swapyInstance.onSwapEnd(async (event: any) => {
      console.log('🔄 Swapy swap ended', event)
      
      // Usar el slotItemMap de Swapy que contiene el nuevo orden
      if (!event.slotItemMap) {
        console.log('❌ No slotItemMap found')
        isSwapping = false
        return
      }
      
      console.log('🗺️ SlotItemMap:', event.slotItemMap)
      
      // Usar asObject que es un objeto {slotId: itemId}
      let newOrder: string[] = []
      
      if (event.slotItemMap.asObject) {
        // asObject es un objeto donde las keys son slotIds y los valores son itemIds
        // Como usamos action.id para ambos (slot e item), simplemente tomamos los valores
        newOrder = Object.values(event.slotItemMap.asObject).filter((id: any) => id)
        console.log('📋 Using asObject, newOrder:', newOrder)
      } else if (event.slotItemMap.asArray && Array.isArray(event.slotItemMap.asArray)) {
        // asArray es un array de objetos {slotId, itemId}
        newOrder = event.slotItemMap.asArray
          .filter((item: any) => item && item.itemId)
          .map((item: any) => item.itemId)
        console.log('📋 Using asArray, newOrder:', newOrder)
      }
      
      console.log('📋 Order before swap:', orderBeforeSwap)
      
      // Crear array de acciones en el nuevo orden
      const reorderedActions = newOrder
        .map(id => props.buttonConfig.actions.find(a => a.id === id))
        .filter(a => a !== undefined)
      
      console.log('🔢 Reordered actions count:', reorderedActions.length)
      console.log('🔢 Actions:', reorderedActions.map(a => a.type))
      
      // Verificar si el orden cambió comparando con el orden ANTES del swap
      const hasChanged = newOrder.length > 0 && newOrder.some((id, index) => id !== orderBeforeSwap[index])
      
      console.log('🔍 Has changed?', hasChanged)
      
      if (hasChanged && reorderedActions.length === props.buttonConfig.actions.length) {
        console.log('✅ Emitting reorder-actions event')
        // NO actualizamos el estado local, solo guardamos
        // Swapy mantiene el orden visual correcto
        emit('reorder-actions', reorderedActions)
      }
      
      // Marcar como no-swapping DESPUÉS de un delay para permitir que se guarde
      setTimeout(() => {
        isSwapping = false
        orderBeforeSwap = []
        console.log('🔄 Swap complete')
      }, 100)
    })
  }
}

// Watch for actions length changes ONLY (not order changes)
watch(() => props.buttonConfig.actions.length, async (newLength, oldLength) => {
  if (!isSwapping && newLength !== oldLength) {
    console.log('📏 Actions length changed:', oldLength, '->', newLength)
    await nextTick()
    initSwapy()
  }
})

onMounted(() => {
  window.addEventListener('dragstart', handleGlobalDragStart)
  window.addEventListener('dragend', handleGlobalDragEnd)
  initSwapy()
})

onUnmounted(() => {
  window.removeEventListener('dragstart', handleGlobalDragStart)
  window.removeEventListener('dragend', handleGlobalDragEnd)
  if (swapyInstance) {
    swapyInstance.destroy()
  }
})
</script>