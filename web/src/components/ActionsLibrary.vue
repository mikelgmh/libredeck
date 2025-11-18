<template>
  <div class="space-y-6">
    <!-- Available Actions -->
    <div>
      
      <div v-if="availableActions.length === 0" class="text-sm text-base-content/70">
        No hay acciones disponibles
      </div>
      <div v-else class="grid grid-cols-1 gap-3">
        <div
          v-for="action in availableActions"
          :key="action.type"
          class="card bg-base-100 hover:bg-base-200 cursor-grab transition-all duration-200 border border-base-300 hover:border-primary"
          draggable="true"
          @dragstart="handleDragStart($event, action)"
        >
          <div class="card-body p-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <component :is="action.icon" :size="20" class="text-primary" />
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-sm">{{ action.name }}</h4>
                <p class="text-xs text-base-content/60 mt-1">{{ action.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Plugins -->
    <div>
      <h3 class="text-base font-semibold mb-4">Plugins</h3>
      <div v-if="plugins.length === 0" class="text-sm text-base-content/70">
        No hay plugins instalados
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="plugin in plugins"
          :key="plugin[0]"
          class="card bg-base-300 p-3"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-sm">{{ plugin[1].manifest.name }}</div>
              <div class="text-xs text-base-content/70">v{{ plugin[1].manifest.version }}</div>
            </div>
            <div :class="['badge badge-sm', plugin[1].enabled ? 'badge-success' : 'badge-error']">
              {{ plugin[1].enabled ? 'Activo' : 'Inactivo' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

interface Props {
  plugins: any[]
  searchQuery?: string
}

interface Emits {
  (e: 'action-selected', actionType: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Convert plugin actions to a format suitable for display
const availableActions = computed(() => {
  const actions: Array<{
    type: string
    name: string
    description: string
    icon: any
  }> = []

  // Process each plugin
  props.plugins.forEach((pluginEntry: any) => {
    const [pluginId, pluginData] = pluginEntry

    if (pluginData.actions) {
      // Process each action in the plugin
      pluginData.actions.forEach(([actionId, actionData]: [string, any]) => {
        // Get icon from action data or use a default
        let iconName = actionData.icon || 'Settings'

        const icon = (LucideIcons as any)[iconName] || (LucideIcons as any)['Settings']

        actions.push({
          type: `${pluginId}.${actionId}`,
          name: actionData.name || actionId,
          description: actionData.description || `Acción ${actionId}`,
          icon
        })
      })
    }
  })

  // Filter by search query if provided
  if (props.searchQuery && props.searchQuery.trim()) {
    const query = props.searchQuery.toLowerCase().trim()
    return actions.filter(action =>
      action.name.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query) ||
      action.type.toLowerCase().includes(query)
    )
  }

  return actions
})

// Drag and drop handler
const handleDragStart = (event: DragEvent, action: any) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: action.type,
      name: action.name
    }))
    event.dataTransfer.effectAllowed = 'copy'
  }
}
</script>