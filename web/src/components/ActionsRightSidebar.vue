<template>
  <div class="w-80 bg-base-200 border-l border-base-300 flex flex-col h-screen" data-cy="actions-sidebar">
    <!-- Header -->
    <div class="p-4 border-b border-base-300">
      <h2 class="text-lg font-semibold mb-3">{{ t('actionsSidebar.actionsLibrary') }}</h2>
      
      <!-- Search -->
      <div class="form-control">
        <input 
          v-model="searchQuery"
          type="text" 
          :placeholder="t('actionsSidebar.searchActions')"
          class="input input-bordered input-sm w-full"
        />
      </div>
    </div>

    <!-- Actions List -->
    <div class="flex-1 overflow-y-auto p-4">
      <ActionsLibrary
        :plugins="plugins"
        :search-query="searchQuery"
      />
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-base-300">
      <div class="text-xs text-base-content/70 text-center">
        {{ t('actionsSidebar.availableActions', { count: availableActionsCount }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18nStore } from '../composables/useI18n'
import ActionsLibrary from './ActionsLibrary.vue'
import * as LucideIcons from 'lucide-vue-next'

const { t } = useI18nStore()

interface Props {
  plugins: any[]
}

const props = defineProps<Props>()

const searchQuery = ref('')

// Calculate available actions count
const availableActionsCount = computed(() => {
  let actions: any[] = []

  // Process each plugin
  props.plugins.forEach((pluginEntry: any) => {
    const [pluginId, pluginData] = pluginEntry

    if (pluginData.actions) {
      // Process each action in the plugin
      pluginData.actions.forEach(([actionId, actionData]: [string, any]) => {
        actions.push({
          type: `${pluginId}.${actionId}`,
          name: actionData.name || actionId,
          description: actionData.description || `Acción ${actionId}`
        })
      })
    }
  })

  // Filter by search query if provided
  if (searchQuery.value && searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    actions = actions.filter(action =>
      action.name.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query) ||
      action.type.toLowerCase().includes(query)
    )
  }

  return actions.length
})
</script>

<style scoped>
.action-item {
  user-select: none;
}

.action-item:active {
  opacity: 0.7;
  cursor: grabbing;
}
</style>
