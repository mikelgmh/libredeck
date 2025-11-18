<template>
  <div class="w-80 bg-base-200 border-l border-base-300 flex flex-col h-screen">
    <!-- Header -->
    <div class="p-4 border-b border-base-300">
      <h2 class="text-lg font-semibold mb-3">Biblioteca de Acciones</h2>
      
      <!-- Search -->
      <div class="form-control">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar acciones..."
          class="input input-bordered input-sm w-full"
        />
      </div>
    </div>

    <!-- Actions List -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="space-y-2">
        <div 
          v-for="action in filteredActions" 
          :key="action.type"
          class="action-item card bg-base-300 p-3 cursor-move hover:bg-base-300/80 transition-colors"
          :data-action-type="action.type"
          draggable="true"
          @dragstart="handleDragStart($event, action)"
        >
          <div class="flex items-center gap-3">
            <component :is="action.icon" :size="20" class="text-primary" />
            <div class="flex-1">
              <div class="font-medium text-sm">{{ action.name }}</div>
              <div class="text-xs text-base-content/70">{{ action.description }}</div>
            </div>
          </div>
        </div>

        <!-- No results -->
        <div v-if="filteredActions.length === 0" class="text-center py-8 text-sm text-base-content/50">
          No se encontraron acciones
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-base-300">
      <div class="text-xs text-base-content/70 text-center">
        {{ filteredActions.length }} acción{{ filteredActions.length !== 1 ? 'es' : '' }} disponible{{ filteredActions.length !== 1 ? 's' : '' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Terminal, Globe, Keyboard, Volume2, Type, Play, Pause, SkipForward, SkipBack, FolderOpen } from 'lucide-vue-next'

interface ActionType {
  type: string
  name: string
  description: string
  icon: any
  category?: string
}

const searchQuery = ref('')

const availableActions: ActionType[] = [
  {
    type: 'shell',
    name: 'Ejecutar Comando',
    description: 'Ejecuta comandos del sistema',
    icon: Terminal,
    category: 'Sistema'
  },
  {
    type: 'http',
    name: 'Llamada HTTP',
    description: 'Realiza peticiones HTTP/API',
    icon: Globe,
    category: 'Web'
  },
  {
    type: 'hotkey',
    name: 'Atajo de Teclado',
    description: 'Simula combinaciones de teclas',
    icon: Keyboard,
    category: 'Teclado'
  },
  {
    type: 'type',
    name: 'Escribir Texto',
    description: 'Simula escritura de texto en el teclado',
    icon: Type,
    category: 'Teclado'
  },
  {
    type: 'multimedia',
    name: 'Control Multimedia',
    description: 'Controla reproducción de audio/video',
    icon: Volume2,
    category: 'Multimedia'
  },
  {
    type: 'open-app',
    name: 'Abrir Aplicación',
    description: 'Abre una aplicación o archivo',
    icon: FolderOpen,
    category: 'Sistema'
  }
]

const filteredActions = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableActions
  }
  
  const query = searchQuery.value.toLowerCase()
  return availableActions.filter(action => 
    action.name.toLowerCase().includes(query) ||
    action.description.toLowerCase().includes(query) ||
    action.category?.toLowerCase().includes(query)
  )
})

const handleDragStart = (event: DragEvent, action: ActionType) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: action.type,
      name: action.name
    }))
  }
}
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
