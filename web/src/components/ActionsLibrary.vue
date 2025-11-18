<template>
  <div class="space-y-6">
    <!-- Actions Library -->
    <div>
      <h3 class="text-base font-semibold mb-4">Biblioteca de Acciones</h3>
      <div class="space-y-2">
        <div 
          v-for="actionType in availableActions" 
          :key="actionType.type"
          class="card bg-base-300 p-3 cursor-pointer hover:bg-base-300/80 transition-colors"
        >
          <div class="flex items-center gap-3">
            <component :is="actionType.icon" :size="20" class="text-primary" />
            <div>
              <div class="font-medium text-sm">{{ actionType.name }}</div>
              <div class="text-xs text-base-content/70">{{ actionType.description }}</div>
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
          :key="plugin.id"
          class="card bg-base-300 p-3"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-sm">{{ plugin.name }}</div>
              <div class="text-xs text-base-content/70">v{{ plugin.version }}</div>
            </div>
            <div :class="['badge badge-sm', plugin.enabled ? 'badge-success' : 'badge-error']">
              {{ plugin.enabled ? 'Activo' : 'Inactivo' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Terminal, Globe, Keyboard, Volume2, Type } from 'lucide-vue-next'
import type { ActionType } from '../types/streamdeck'

interface Props {
  plugins: any[]
}

const props = defineProps<Props>()

const availableActions: ActionType[] = [
  {
    type: 'shell',
    name: 'Ejecutar Comando',
    description: 'Ejecuta comandos del sistema',
    icon: Terminal
  },
  {
    type: 'http',
    name: 'Llamada HTTP',
    description: 'Realiza peticiones HTTP/API',
    icon: Globe
  },
  {
    type: 'hotkey',
    name: 'Atajo de Teclado',
    description: 'Simula combinaciones de teclas',
    icon: Keyboard
  },
  {
    type: 'type',
    name: 'Escribir Texto',
    description: 'Simula escritura de texto en el teclado',
    icon: Type
  },
  {
    type: 'multimedia',
    name: 'Control Multimedia',
    description: 'Controla reproducción de audio/video',
    icon: Volume2
  }
]
</script>