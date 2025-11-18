<template>
  <div class="card bg-base-300 p-3 cursor-default">
    <div class="flex items-center gap-2 mb-2">
      <!-- Drag Handle - ONLY draggable element -->
      <button
        data-swapy-handle
        class="btn btn-ghost btn-xs px-1 cursor-grab active:cursor-grabbing hover:bg-base-content/10"
        title="Arrastrar para reordenar"
      >
        <GripVertical :size="16" class="text-base-content/50" />
      </button>

      <span class="text-xs font-medium text-base-content/70 uppercase tracking-wider" data-swapy-no-drag>{{ getActionDisplayName(action.type) }}</span>

      <button
        @click="$emit('remove')"
        class="btn btn-ghost btn-xs hover:btn-error ml-auto"
        data-swapy-no-drag
        title="Eliminar acción"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <!-- Generic Schema-based Form -->
    <SchemaForm
      v-if="actionSchema"
      :schema="actionSchema"
      :model-value="action.parameters"
      :available-pages="availablePages"
      @update:model-value="updateParameters"
      data-swapy-no-drag
    />

    <!-- Fallback for actions without schema -->
    <div v-else class="text-xs text-base-content/60" data-swapy-no-drag>
      Configuración no disponible para esta acción
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GripVertical, Trash2 } from 'lucide-vue-next'
import SchemaForm from './SchemaForm.vue'

interface ActionData {
  id?: string
  type: string
  parameters: Record<string, any>
}

interface SchemaProperty {
  type: string
  title?: string
  description?: string
  default?: any
  enum?: string[]
  ui?: {
    component: string
    type?: string
    placeholder?: string
    options?: Array<{ value: any; label: string }>
    min?: number
    max?: number
    rows?: number
  }
}

interface ActionSchema {
  type: 'object'
  properties: Record<string, SchemaProperty>
  required?: string[]
}

interface Props {
  action: ActionData
  index: number
  plugins: any[]
  availablePages?: Array<{ id: string; name: string }>
}

interface Emits {
  (e: 'update-parameter', paramKey: string, value: any): void
  (e: 'remove'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Find the schema for this action type from plugins
const actionSchema = computed(() => {
  if (!props.plugins) return null

  for (const pluginEntry of props.plugins) {
    const [pluginId, pluginData] = pluginEntry

    if (pluginData.actions) {
      for (const [actionId, actionData] of pluginData.actions) {
        const fullActionType = `${pluginId}.${actionId}`

        if (fullActionType === props.action.type && actionData.schema) {
          return actionData.schema as ActionSchema
        }
      }
    }
  }

  return null
})

// Helper functions for action types
const getActionBaseType = (type: string): string => {
  // Handle plugin.action format (e.g., "shell.shell" -> "shell")
  if (type.includes('.')) {
    return type.split('.')[1] || type
  }
  return type
}

const getActionDisplayName = (type: string): string => {
  // Try to get name from plugin data first
  if (props.plugins) {
    for (const pluginEntry of props.plugins) {
      const [pluginId, pluginData] = pluginEntry

      if (pluginData.actions) {
        for (const [actionId, actionData] of pluginData.actions) {
          const fullActionType = `${pluginId}.${actionId}`

          if (fullActionType === type) {
            return actionData.name || actionId
          }
        }
      }
    }
  }

  // Fallback to base type
  const baseType = getActionBaseType(type)

  const displayNames: Record<string, string> = {
    'shell': 'Comando Shell',
    'http': 'Petición HTTP',
    'hotkey': 'Atajo de Teclado',
    'type': 'Escribir Texto',
    'multimedia': 'Multimedia',
    'page': 'Cambiar Página',
    'open-app': 'Abrir Aplicación',
    'open-url': 'Abrir URL',
    'delay': 'Retraso'
  }

  return displayNames[baseType] || baseType.toUpperCase()
}

const updateParameters = (newParameters: Record<string, any>) => {
  // Emit updates for all changed parameters
  for (const [key, value] of Object.entries(newParameters)) {
    emit('update-parameter', key, value)
  }
}
</script>