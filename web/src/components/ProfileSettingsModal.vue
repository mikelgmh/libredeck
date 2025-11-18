<template>
  <dialog ref="dialog" class="profile-settings-modal">
    <div class="modal-content">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-xl font-bold text-base-content">Ajustes de Perfiles</h2>
      </div>

      <!-- Body -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Columna Izquierda: Listado de Perfiles -->
        <div class="flex flex-col gap-4">
          <h3 class="text-lg font-semibold text-base-content">Perfiles</h3>

          <div class="flex-1 bg-base-100 rounded-lg p-4 min-h-0">
            <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
              <div
                v-for="profile in profiles"
                :key="profile.id"
                :class="[
                  'p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-base-200',
                  selectedProfileId === profile.id
                    ? 'bg-primary text-primary-content shadow-md'
                    : 'bg-base-200 text-base-content'
                ]"
                @click="selectProfile(profile.id)"
              >
                {{ profile.name }}
              </div>
            </div>
          </div>

          <button
            @click="showCreateModal = true"
            class="btn btn-accent btn-sm w-full"
          >
            <Plus :size="16" class="mr-2" />
            Nuevo Perfil
          </button>
        </div>

        <!-- Columna Derecha: Ajustes del Perfil Seleccionado -->
        <div v-if="selectedProfile" class="flex flex-col gap-4">
          <h3 class="text-lg font-semibold text-base-content">
            Ajustes de "{{ selectedProfile.name }}"
          </h3>

          <div class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Nombre del perfil</span>
              </label>
              <input
                v-model="profileName"
                type="text"
                class="input input-bordered"
                @blur="handleNameChange"
                @keyup.enter="handleNameChange"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Columnas del grid</span>
              </label>
              <input
                v-model.number="gridCols"
                type="number"
                min="3"
                max="8"
                class="input input-bordered"
                @blur="handleGridColsChange"
                @keyup.enter="handleGridColsChange"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Filas del grid</span>
              </label>
              <input
                v-model.number="gridRows"
                type="number"
                min="2"
                max="6"
                class="input input-bordered"
                @blur="handleGridRowsChange"
                @keyup.enter="handleGridRowsChange"
              />
            </div>
          </div>

          <AutoProfileSwitcher
            :available-profiles="profiles"
            @config-updated="handleAutoSwitchConfigUpdate"
          />

          <div class="mt-auto pt-4 border-t border-base-300">
            <button
              @click="deleteProfile"
              class="btn btn-outline btn-error btn-sm w-full"
              :disabled="profiles.length <= 1"
            >
              Eliminar Perfil
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 pt-4 border-t border-base-300">
        <button @click="closeModal" class="btn btn-ghost">
          Cerrar
        </button>
      </div>
    </div>

    <!-- Create Profile Modal -->
    <div v-if="showCreateModal" class="create-profile-overlay show">
      <div class="bg-base-100 rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
        <h3 class="text-lg font-bold mb-4">Crear Nuevo Perfil</h3>

        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text">Nombre del perfil</span>
          </label>
          <input
            v-model="newProfileName"
            type="text"
            placeholder="Ej: Gaming, Trabajo, Streaming..."
            class="input input-bordered"
            @keyup.enter="handleCreateProfile"
          />
        </div>

        <div class="flex justify-end gap-3">
          <button @click="showCreateModal = false" class="btn btn-ghost">
            Cancelar
          </button>
          <button
            @click="handleCreateProfile"
            class="btn btn-accent"
            :disabled="!newProfileName.trim()"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Plus } from 'lucide-vue-next'
import AutoProfileSwitcher from './AutoProfileSwitcher.vue'
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

const dialog = ref<HTMLDialogElement | null>(null)
const isClosing = ref(false)
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

const handleAutoSwitchConfigUpdate = (config: { enabled: boolean; rules: any[] }) => {
  console.log('Auto-profile configuration updated:', config)
  // The AutoProfileSwitcher component handles saving to global settings
  // No need to update individual profile data anymore
}

const showModal = () => {
  isClosing.value = false
  dialog.value?.showModal()
  if (props.selectedProfile) {
    selectProfile(props.selectedProfile)
  }
}

const closeModal = () => {
  if (isClosing.value) return
  
  isClosing.value = true
  dialog.value?.classList.add('closing')
  
  // Esperar a que termine la animación antes de cerrar realmente
  setTimeout(() => {
    dialog.value?.close()
    dialog.value?.classList.remove('closing')
    isClosing.value = false
  }, 500) // 500ms es la duración de la transición
}

// Cerrar modal al hacer clic en el backdrop
onMounted(() => {
  dialog.value?.addEventListener('click', (e) => {
    const rect = dialog.value!.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      closeModal()
    }
  })
})

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
/* Modal Dialog */
.profile-settings-modal {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  padding: 0;
  background-color: #1f2937;
  max-width: 90vw;
  width: 800px;
  max-height: 90vh;
  opacity: 0;
  transform: scale(0.95) translateY(-1rem);
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    overlay 0.5s cubic-bezier(0.4, 0, 0.2, 1) allow-discrete,
    display 0.5s cubic-bezier(0.4, 0, 0.2, 1) allow-discrete;
  margin: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

.profile-settings-modal[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.profile-settings-modal.closing {
  opacity: 0;
  transform: scale(0.95) translateY(-1rem);
}

@starting-style {
  .profile-settings-modal[open] {
    opacity: 0;
    transform: scale(0.95) translateY(-1rem);
  }
}

/* Backdrop styles */
.profile-settings-modal::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    display 0.5s allow-discrete,
    overlay 0.5s allow-discrete;
}

.profile-settings-modal[open]::backdrop {
  opacity: 1;
}

.profile-settings-modal.closing::backdrop {
  opacity: 0;
}

@starting-style {
  .profile-settings-modal[open]::backdrop {
    opacity: 0;
  }
}

/* Modal Content */
.modal-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: stretch;
  background-color: #1f2937;
  max-height: 80vh;
  overflow-y: auto;
}

/* Create Profile Overlay */
.create-profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.create-profile-overlay.show {
  opacity: 1;
}
</style>