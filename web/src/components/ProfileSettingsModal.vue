<template>
  <Modal ref="modal">
    <div class="profile-settings-modal">
      <h2 class="modal-title">Ajustes de Perfiles</h2>
      
      <div class="modal-body">
        <!-- Columna Izquierda: Listado de Perfiles -->
        <div class="profiles-list">
          <h3>Perfiles</h3>
          <div class="profiles-container">
            <div 
              v-for="profile in profiles" 
              :key="profile.id"
              :class="['profile-item', { active: selectedProfileId === profile.id }]"
              @click="selectProfile(profile.id)"
            >
              {{ profile.name }}
            </div>
          </div>
          <button 
            @click="showCreateModal = true"
            class="btn btn-primary btn-sm w-full mt-2"
          >
            <Plus :size="16" />
            Nuevo Perfil
          </button>
        </div>
        
        <!-- Columna Derecha: Ajustes del Perfil Seleccionado -->
        <div class="profile-settings" v-if="selectedProfile">
          <h3>Ajustes de "{{ selectedProfile.name }}"</h3>
          
          <div class="form-group">
            <label class="form-label">Nombre del perfil</label>
            <input 
              v-model="profileName" 
              type="text" 
              class="input input-bordered w-full"
              @blur="handleNameChange"
              @keyup.enter="handleNameChange"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Columnas del grid</label>
            <input 
              v-model.number="gridCols" 
              type="number" 
              min="3" 
              max="8" 
              class="input input-bordered w-full"
              @blur="handleGridColsChange"
              @keyup.enter="handleGridColsChange"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Filas del grid</label>
            <input 
              v-model.number="gridRows" 
              type="number" 
              min="2" 
              max="6" 
              class="input input-bordered w-full"
              @blur="handleGridRowsChange"
              @keyup.enter="handleGridRowsChange"
            />
          </div>
          
          <div class="form-actions">
            <button 
              @click="deleteProfile" 
              class="btn btn-error btn-sm"
              :disabled="profiles.length <= 1"
            >
              Eliminar Perfil
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button @click="closeModal" class="btn">Cerrar</button>
      </div>
    </div>
    
    <!-- Create Profile Modal -->
    <div v-if="showCreateModal" class="create-profile-overlay">
      <div class="create-profile-modal">
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
          <button @click="showCreateModal = false" class="btn">Cancelar</button>
          <button @click="handleCreateProfile" class="btn btn-primary" :disabled="!newProfileName.trim()">
            Crear
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import Modal from './Modal.vue'
import type { ProfileData } from '../types/streamdeck'

interface Props {
  profiles: ProfileData[]
  selectedProfile: string
}

interface Emits {
  (e: 'profile-changed', profileId: string): void
  (e: 'profile-created', name: string): Promise<void>
  (e: 'profile-updated', profileId: string, updates: any): void
  (e: 'profile-deleted', profileId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modal = ref<InstanceType<typeof Modal> | null>(null)
const showCreateModal = ref(false)
const newProfileName = ref('')
const selectedProfileId = ref(props.selectedProfile)
const profileName = ref('')
const gridCols = ref(5)
const gridRows = ref(3)

const selectedProfile = computed(() => {
  return props.profiles.find(p => p.id === selectedProfileId.value)
})

const selectProfile = (profileId: string) => {
  selectedProfileId.value = profileId
  const profile = props.profiles.find(p => p.id === profileId)
  if (profile) {
    profileName.value = profile.name
    let data = profile.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        data = {}
      }
    }
    gridCols.value = data?.gridCols || 5
    gridRows.value = data?.gridRows || 3
  }
}

const handleNameChange = () => {
  if (selectedProfile.value && profileName.value !== selectedProfile.value.name) {
    emit('profile-updated', selectedProfileId.value, { name: profileName.value })
  }
}

const handleGridColsChange = () => {
  if (selectedProfile.value) {
    let currentData = selectedProfile.value.data
    if (typeof currentData === 'string') {
      try {
        currentData = JSON.parse(currentData)
      } catch {
        currentData = {}
      }
    }
    emit('profile-updated', selectedProfileId.value, { 
      data: { 
        ...currentData, 
        gridCols: gridCols.value 
      } 
    })
  }
}

const handleGridRowsChange = () => {
  if (selectedProfile.value) {
    let currentData = selectedProfile.value.data
    if (typeof currentData === 'string') {
      try {
        currentData = JSON.parse(currentData)
      } catch {
        currentData = {}
      }
    }
    emit('profile-updated', selectedProfileId.value, { 
      data: { 
        ...currentData, 
        gridRows: gridRows.value 
      } 
    })
  }
}

const handleCreateProfile = async () => {
  if (!newProfileName.value.trim()) return
  
  try {
    await emit('profile-created', newProfileName.value.trim())
    showCreateModal.value = false
    newProfileName.value = ''
  } catch (error) {
    console.error('Failed to create profile:', error)
  }
}

const deleteProfile = () => {
  if (selectedProfile.value && props.profiles.length > 1) {
    if (confirm(`¿Estás seguro de que quieres eliminar el perfil "${selectedProfile.value.name}"?`)) {
      emit('profile-deleted', selectedProfileId.value)
    }
  }
}

const showModal = () => {
  modal.value?.showModal()
  if (props.selectedProfile) {
    selectProfile(props.selectedProfile)
  }
}

const closeModal = () => {
  modal.value?.closeModal()
}

watch(() => props.selectedProfile, (newVal) => {
  if (newVal) {
    selectedProfileId.value = newVal
    selectProfile(newVal)
  }
})

defineExpose({
  showModal,
  closeModal
})
</script>

<style scoped>
.profile-settings-modal {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #f9fafb;
  margin: 0;
  text-align: center;
}

.modal-body {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  min-height: 400px;
}

.profiles-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profiles-list h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f9fafb;
  margin: 0;
}

.profiles-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.profile-item {
  padding: 0.75rem 1rem;
  background-color: #374151;
  border-radius: 0.5rem;
  color: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-item:hover {
  background-color: #4b5563;
}

.profile-item.active {
  background-color: #3b82f6;
  color: white;
}

.profile-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-settings h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f9fafb;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #d1d5db;
}

.input {
  background-color: #374151;
  border: 1px solid #4b5563;
  border-radius: 0.375rem;
  color: #f9fafb;
  padding: 0.5rem 0.75rem;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.form-actions {
  margin-top: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #374151;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-error {
  background-color: #dc2626;
  color: white;
}

.btn-error:hover {
  background-color: #b91c1c;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.create-profile-modal {
  background-color: #1f2937;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
}

.modal-action {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>