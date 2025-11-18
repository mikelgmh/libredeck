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
      
      <span class="text-xs font-medium text-base-content/70 uppercase tracking-wider" data-swapy-no-drag>{{ action.type }}</span>
      
      <button 
        @click="$emit('remove')"
        class="btn btn-ghost btn-xs hover:btn-error ml-auto"
        data-swapy-no-drag
        title="Eliminar acción"
      >
        <Trash2 :size="14" />
      </button>
    </div>
    
    <!-- Shell Action -->
    <div v-if="action.type === 'shell'" class="space-y-2" data-swapy-no-drag>
      <input 
        :value="action.parameters.command || ''"
        @input="updateParameter('command', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="comando a ejecutar"
        class="input input-bordered input-xs w-full"
        data-swapy-no-drag
      />
    </div>

    <!-- HTTP Action -->
    <div v-else-if="action.type === 'http'" class="space-y-2" data-swapy-no-drag>
      <select 
        :value="action.parameters.method || 'GET'"
        @change="updateParameter('method', ($event.target as HTMLSelectElement).value)"
        class="select select-bordered select-xs w-full"
        data-swapy-no-drag
      >
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
      </select>
      <input 
        :value="action.parameters.url || ''"
        @input="updateParameter('url', ($event.target as HTMLInputElement).value)"
        type="url" 
        placeholder="https://api.example.com/endpoint"
        class="input input-bordered input-xs w-full"
        data-swapy-no-drag
      />
    </div>

    <!-- Hotkey Action -->
    <div v-else-if="action.type === 'hotkey'" class="space-y-2" data-swapy-no-drag>
      <input 
        :value="action.parameters.keys || ''"
        @input="updateParameter('keys', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="ctrl+c, alt+tab, etc"
        class="input input-bordered input-xs w-full"
        data-swapy-no-drag
      />
    </div>

    <!-- Type Text Action -->
    <div v-else-if="action.type === 'type'" class="space-y-2" data-swapy-no-drag>
      <textarea 
        :value="action.parameters.text || ''"
        @input="updateParameter('text', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Texto a escribir..."
        class="textarea textarea-bordered textarea-xs w-full min-h-[80px]"
        data-swapy-no-drag
      ></textarea>
      <div class="flex items-center gap-2">
        <label class="label text-xs" data-swapy-no-drag>Delay (ms):</label>
        <input 
          :value="action.parameters.delay || 0"
          @input="updateParameter('delay', parseInt(($event.target as HTMLInputElement).value) || 0)"
          type="number" 
          min="0"
          max="1000"
          placeholder="0"
          class="input input-bordered input-xs w-20"
          data-swapy-no-drag
        />
      </div>
    </div>

    <!-- Multimedia Action -->
    <div v-else-if="action.type === 'multimedia'" class="space-y-2" data-swapy-no-drag>
      <select 
        :value="action.parameters.action || 'playpause'"
        @change="updateParameter('action', ($event.target as HTMLSelectElement).value)"
        class="select select-bordered select-xs w-full"
        data-swapy-no-drag
      >
        <option value="play">Play</option>
        <option value="pause">Pause</option>
        <option value="playpause">Play/Pause</option>
        <option value="stop">Stop</option>
        <option value="next">Siguiente</option>
        <option value="previous">Anterior</option>
        <option value="volumeup">Subir Volumen</option>
        <option value="volumedown">Bajar Volumen</option>
        <option value="mute">Silenciar</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, GripVertical, Trash2 } from 'lucide-vue-next'

interface ActionData {
  id?: string
  type: string
  parameters: Record<string, any>
}

interface Props {
  action: ActionData
  index: number
}

interface Emits {
  (e: 'update-parameter', paramKey: string, value: any): void
  (e: 'remove'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateParameter = (paramKey: string, value: any) => {
  emit('update-parameter', paramKey, value)
}
</script>