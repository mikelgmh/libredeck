<template>
  <div class="executable-selector">
    <div class="selector-header">
      <h6 class="text-sm font-medium text-base-content">Aplicación específica</h6>
      <div class="selector-options">
        <button
          @click="showFileSelector = true"
          class="btn btn-outline btn-xs"
        >
          <FolderOpen :size="14" class="mr-1" />
          Seleccionar ejecutable
        </button>
        <button
          @click="showWindowScanner = true"
          class="btn btn-outline btn-xs"
        >
          <Scan :size="14" class="mr-1" />
          Escanear ventanas
        </button>
      </div>
    </div>

    <div v-if="executablePath || processName" class="selected-executable">
      <div class="executable-info">
        <div v-if="executablePath" class="info-item">
          <span class="info-label">Ejecutable:</span>
          <code class="info-value">{{ executablePath.split('\\').pop() }}</code>
        </div>
        <div v-if="processName" class="info-item">
          <span class="info-label">Proceso:</span>
          <code class="info-value">{{ processName }}</code>
        </div>
      </div>
      <button
        @click="clearSelection"
        class="btn btn-ghost btn-xs text-error"
      >
        <X :size="14" />
      </button>
    </div>

    <!-- File Selector Modal -->
    <div v-if="showFileSelector" class="selector-overlay show">
      <div class="selector-modal">
        <h3 class="text-lg font-bold mb-4">Seleccionar Ejecutable</h3>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Ruta del ejecutable</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="manualPath"
              type="text"
              placeholder="C:\Program Files\App\app.exe"
              class="input input-bordered flex-1"
            />
            <button
              @click="browseFile"
              class="btn btn-outline"
            >
              <FolderOpen :size="16" />
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showFileSelector = false" class="btn btn-ghost">
            Cancelar
          </button>
          <button
            @click="selectManualPath"
            class="btn btn-primary"
            :disabled="!manualPath.trim()"
          >
            Seleccionar
          </button>
        </div>
      </div>
    </div>

    <!-- Window Scanner Modal -->
    <WindowScanner
      v-if="showWindowScanner"
      @window-selected="onWindowSelected"
      @close="showWindowScanner = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen, Scan, X } from 'lucide-vue-next'
import WindowScanner from './WindowScanner.vue'

interface Props {
  executablePath?: string
  processName?: string
}

interface Emits {
  (e: 'update:modelValue', value: { executablePath?: string; processName?: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showFileSelector = ref(false)
const showWindowScanner = ref(false)
const manualPath = ref('')

const clearSelection = () => {
  emit('update:modelValue', {})
}

const browseFile = async () => {
  try {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const hostname = window.location.hostname
    const apiUrl = `${protocol}//${hostname}:3001/api/v1/files/select`

    const response = await fetch(apiUrl)

    if (response.ok) {
      const result = await response.json()

      if (result.success && result.path) {
        manualPath.value = result.path
      }
    } else {
      alert('Error al abrir el diálogo de selección de archivos.')
    }
  } catch (error) {
    alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

const selectManualPath = () => {
  if (manualPath.value.trim()) {
    emit('update:modelValue', {
      executablePath: manualPath.value.trim(),
      processName: manualPath.value.split('\\').pop()?.replace('.exe', '') || ''
    })
    showFileSelector.value = false
    manualPath.value = ''
  }
}

const onWindowSelected = (window: any) => {
  emit('update:modelValue', {
    executablePath: window.executablePath,
    processName: window.processName
  })
  showWindowScanner.value = false
}
</script>

<style scoped>
.executable-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selector-options {
  display: flex;
  gap: 0.5rem;
}

.selected-executable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: hsl(var(--b2));
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.executable-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.info-label {
  font-weight: 500;
  color: hsl(var(--bc) / 0.7);
}

.info-value {
  background-color: hsl(var(--b1));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.selector-overlay {
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

.selector-overlay.show {
  opacity: 1;
}

.selector-modal {
  background-color: hsl(var(--b1));
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  max-width: 28rem;
  width: 100%;
  margin: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>