<template>
  <div class="p-4 border-b border-base-300">
    <label class="form-control w-full">
      <div class="label">
        <span class="label-text font-medium">Perfil Activo</span>
      </div>
      <select 
        :value="selectedProfile" 
        @change="handleProfileChange" 
        class="select select-bordered select-sm w-full"
      >
        <option value="">Seleccionar perfil...</option>
        <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
          {{ profile.name }}
        </option>
      </select>
    </label>
    <button 
      @click="showModal = true" 
      class="btn btn-primary btn-sm w-full mt-2"
    >
      <Plus :size="16" />
      Nuevo Perfil
    </button>

    <!-- Create Profile Modal -->
    <div v-if="showModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Crear Nuevo Perfil</h3>
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Nombre del perfil</span>
          </div>
          <input 
            v-model="newProfileName" 
            type="text" 
            placeholder="Ej: Gaming, Trabajo, Streaming..."
            class="input input-bordered w-full" 
            @keyup.enter="handleCreateProfile"
          />
        </label>
        <div class="modal-action">
          <button @click="closeModal" class="btn">Cancelar</button>
          <button @click="handleCreateProfile" class="btn btn-primary" :disabled="!newProfileName.trim()">
            Crear
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeModal"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import type { ProfileData } from '../types/streamdeck'

interface Props {
  profiles: ProfileData[]
  selectedProfile: string
}

interface Emits {
  (e: 'profile-changed', profileId: string): void
  (e: 'profile-created', name: string): Promise<void>
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showModal = ref(false)
const newProfileName = ref('')

const handleProfileChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('profile-changed', target.value)
}

const handleCreateProfile = async () => {
  if (!newProfileName.value.trim()) return
  
  try {
    await emit('profile-created', newProfileName.value.trim())
    closeModal()
  } catch (error) {
    console.error('Failed to create profile:', error)
  }
}

const closeModal = () => {
  showModal.value = false
  newProfileName.value = ''
}
</script>