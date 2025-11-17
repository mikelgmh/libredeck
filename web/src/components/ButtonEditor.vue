<template>
  <div class="space-y-4">
    <!-- Basic Settings -->
    <div class="space-y-4">
      <!-- Label -->
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Texto del Botón</span>
        </div>
        <input 
          :value="buttonConfig.label" 
          @input="updateLabel"
          type="text" 
          placeholder="Ej: Play Music"
          class="input input-bordered input-sm w-full" 
        />
      </label>

      <!-- Icon -->
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Emoji/Icono</span>
        </div>
        <input 
          :value="buttonConfig.emoji" 
          @input="updateEmoji"
          type="text" 
          placeholder="🎵 o URL de imagen"
          class="input input-bordered input-sm w-full" 
        />
      </label>

      <!-- Colors -->
      <div class="grid grid-cols-2 gap-2">
        <label class="form-control">
          <div class="label">
            <span class="label-text">Color de Fondo</span>
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
            <span class="label-text">Color de Texto</span>
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
    <div class="divider text-sm">Acciones</div>
    
    <div class="space-y-3">
      <ActionEditor
        v-for="(action, index) in buttonConfig.actions" 
        :key="action.id || index"
        :action="action"
        :index="index"
        @update-parameter="(paramKey, value) => updateActionParameter(index, paramKey, value)"
        @remove="() => removeAction(index)"
      />

      <!-- Add Action Button -->
      <div class="dropdown dropdown-top w-full">
        <label tabindex="0" class="btn btn-outline btn-sm w-full">
          <Plus :size="16" />
          Añadir Acción
        </label>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full">
          <li><a @click="() => addAction('shell')"><Terminal :size="16" />Ejecutar Comando</a></li>
          <li><a @click="() => addAction('http')"><Globe :size="16" />Llamada HTTP</a></li>
          <li><a @click="() => addAction('hotkey')"><Keyboard :size="16" />Atajo de Teclado</a></li>
          <li><a @click="() => addAction('multimedia')"><Volume2 :size="16" />Multimedia</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Terminal, Globe, Keyboard, Volume2 } from 'lucide-vue-next'
import ActionEditor from './ActionEditor.vue'
import type { ButtonData } from '../types/streamdeck'

interface Props {
  buttonConfig: ButtonData
}

interface Emits {
  (e: 'update:label', value: string): void
  (e: 'update:emoji', value: string): void
  (e: 'update:backgroundColor', value: string): void
  (e: 'update:textColor', value: string): void
  (e: 'add-action', type: string): void
  (e: 'remove-action', index: number): void
  (e: 'update-action-parameter', actionIndex: number, paramKey: string, value: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateLabel = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:label', target.value)
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
</script>