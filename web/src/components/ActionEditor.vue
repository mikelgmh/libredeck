<template>
  <div class="card bg-base-300 p-3">
    <div class="flex justify-between items-start mb-2">
      <span class="badge badge-primary badge-sm">{{ action.type }}</span>
      <button 
        @click="$emit('remove')"
        class="btn btn-ghost btn-xs text-error"
      >
        <X :size="14" />
      </button>
    </div>
    
    <!-- Shell Action -->
    <div v-if="action.type === 'shell'" class="space-y-2">
      <input 
        :value="action.parameters.command || ''"
        @input="updateParameter('command', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="comando a ejecutar"
        class="input input-bordered input-xs w-full"
      />
    </div>

    <!-- HTTP Action -->
    <div v-else-if="action.type === 'http'" class="space-y-2">
      <select 
        :value="action.parameters.method || 'GET'"
        @change="updateParameter('method', ($event.target as HTMLSelectElement).value)"
        class="select select-bordered select-xs w-full"
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
      />
    </div>

    <!-- Hotkey Action -->
    <div v-else-if="action.type === 'hotkey'" class="space-y-2">
      <input 
        :value="action.parameters.keys || ''"
        @input="updateParameter('keys', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="ctrl+c, alt+tab, etc"
        class="input input-bordered input-xs w-full"
      />
    </div>

    <!-- Type Text Action -->
    <div v-else-if="action.type === 'type'" class="space-y-2">
      <textarea 
        :value="action.parameters.text || ''"
        @input="updateParameter('text', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Texto a escribir..."
        class="textarea textarea-bordered textarea-xs w-full min-h-[80px]"
      ></textarea>
      <div class="flex items-center gap-2">
        <label class="label text-xs">Delay (ms):</label>
        <input 
          :value="action.parameters.delay || 0"
          @input="updateParameter('delay', parseInt(($event.target as HTMLInputElement).value) || 0)"
          type="number" 
          min="0"
          max="1000"
          placeholder="0"
          class="input input-bordered input-xs w-20"
        />
      </div>
    </div>

    <!-- Multimedia Action -->
    <div v-else-if="action.type === 'multimedia'" class="space-y-2">
      <select 
        :value="action.parameters.action || 'playpause'"
        @change="updateParameter('action', ($event.target as HTMLSelectElement).value)"
        class="select select-bordered select-xs w-full"
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
import { X } from 'lucide-vue-next'

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