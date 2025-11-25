<template>
  <dialog ref="dialog" class="update-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">
          <component :is="getLucideIcon('update')" class="title-icon" />
          {{ props.updateInfo?.hasUpdate ? 'Actualización Disponible' : 'Estado de Actualización' }}
        </h3>
      </div>

      <div class="modal-body">
        <div v-if="props.updateInfo" class="update-info">
          <div class="version-info">
            <div class="current-version">
              <span class="label">Versión actual:</span>
              <span class="version">{{ props.updateInfo.currentVersion }}</span>
            </div>
            <div class="new-version">
              <span class="label">Última versión:</span>
              <span class="version" :class="{ highlight: props.updateInfo.hasUpdate }">{{ props.updateInfo.latestVersion }}</span>
            </div>
          </div>

          <div v-if="props.updateInfo.hasUpdate" class="update-available">
            <div class="alert alert-success">
              <component :is="getLucideIcon('check-circle')" />
              ¡Hay una nueva versión disponible!
            </div>

            <div v-if="props.updateInfo.releaseNotes" class="release-notes">
              <h4>Novedades:</h4>
              <div class="notes-content" v-html="formatReleaseNotes(props.updateInfo.releaseNotes)"></div>
            </div>

            <div class="update-actions">
              <button
                @click="startUpdate"
                :disabled="props.isUpdating || props.updateResult !== null"
                class="btn btn-primary update-btn"
              >
                <component v-if="props.isUpdating" :is="getLucideIcon('loader')" class="spinning" />
                <component v-else :is="getLucideIcon('download')" />
                {{ props.isUpdating ? 'Actualizando...' : props.updateResult ? 'Actualización completada' : 'Descargar actualización' }}
              </button>

              <button
                @click="closeModal"
                :disabled="props.isUpdating"
                class="btn btn-secondary cancel-btn"
              >
                {{ props.updateResult ? 'Cerrar' : 'Más Tarde' }}
              </button>
            </div>
          </div>

          <div v-else class="up-to-date">
            <div class="alert alert-info">
              <component :is="getLucideIcon('check-circle')" />
              LibreDeck está actualizado a la última versión
            </div>
          </div>

          <div v-if="updateProgress" class="progress-section">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: updateProgress + '%' }"
              ></div>
            </div>
            <div class="progress-text">{{ updateStatus }}</div>
          </div>

          <div v-if="props.updateResult" class="update-result">
            <div class="alert" :class="props.updateResult.success ? 'alert-success' : 'alert-error'">
              <component :is="getLucideIcon(props.updateResult.success ? 'check-circle' : 'x-circle')" />
              {{ props.updateResult.message }}
            </div>
            <div v-if="props.updateResult.success" class="restart-notice">
              <p>La actualización se aplicará cuando reinicie la aplicación.</p>
            </div>
          </div>
        </div>

        <div v-else-if="props.isChecking" class="loading">
          <component :is="getLucideIcon('loader')" class="spinning" />
          <p>Verificando actualizaciones...</p>
        </div>

        <div v-else class="no-info">
          <p>No se pudo obtener información de versión</p>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  releaseNotes?: string
  publishedAt: string
}

interface Props {
  currentVersion: string
  latestVersion: string
  updateInfo: UpdateInfo | null
  isChecking: boolean
  isUpdating: boolean
  updateResult: { success: boolean; message: string } | null
}

interface Emits {
  (e: 'check-for-updates'): void
  (e: 'start-update'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialog = ref<HTMLDialogElement | null>(null)
const isClosing = ref(false)
const updateProgress = ref<number | null>(null)
const updateStatus = ref<string>('')
const updateResult = ref<{ success: boolean; message: string } | null>(null)

// Get Lucide icon component by name
const getLucideIcon = (iconName: string) => {
  const icons = LucideIcons as Record<string, any>
  const iconMap: Record<string, string> = {
    'update': 'RefreshCw',
    'download': 'Download',
    'loader': 'Loader',
    'check-circle': 'CheckCircle',
    'x-circle': 'XCircle'
  }
  const mappedName = iconMap[iconName] || iconName
  return icons[mappedName] || icons['RefreshCw']
}

const showModal = () => {
  isClosing.value = false
  dialog.value?.showModal()
}

const closeModal = () => {
  if (isClosing.value || props.isUpdating) return

  isClosing.value = true
  dialog.value?.classList.add('closing')

  setTimeout(() => {
    dialog.value?.close()
    dialog.value?.classList.remove('closing')
    isClosing.value = false
  }, 500)
}

const checkForUpdates = () => {
  emit('check-for-updates')
}

const startUpdate = () => {
  updateStatus.value = 'Iniciando actualización...'
  updateProgress.value = 10
  emit('start-update')
}

const resetUpdateState = () => {
  updateProgress.value = null
  updateStatus.value = ''
}

const formatReleaseNotes = (notes: string) => {
  if (!notes) return ''

  // Convert markdown links to HTML
  return notes
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

onMounted(() => {
  // Add click listener for backdrop close
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

defineExpose({
  showModal,
  closeModal
})
</script>

<style scoped>
.update-modal {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  padding: 0;
  background-color: #1f2937;
  max-width: 500px;
  width: 90vw;
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

.update-modal[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.update-modal.closing {
  opacity: 0;
  transform: scale(0.95) translateY(-1rem);
}

@starting-style {
  .update-modal[open] {
    opacity: 0;
    transform: scale(0.95) translateY(-1rem);
  }
}

.update-modal::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    display 0.5s allow-discrete,
    overlay 0.5s allow-discrete;
}

.update-modal[open]::backdrop {
  opacity: 1;
}

.update-modal.closing::backdrop {
  opacity: 0;
}

@starting-style {
  .update-modal[open]::backdrop {
    opacity: 0;
  }
}

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

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  margin: -1.5rem -1.5rem 1.5rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.title-icon {
  font-size: 1.5rem;
}

.modal-body {
  padding: 0 1.5rem 1.5rem;
}

.update-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.current-version,
.new-version {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.version {
  font-family: monospace;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.version.highlight {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border-color: #22c55e;
}

.update-available {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.up-to-date {
  text-align: center;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.restart-notice {
  margin-top: 1rem;
  text-align: center;
}

.restart-notice p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-style: italic;
}

.release-notes {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.release-notes h4 {
  margin: 0 0 0.75rem 0;
  color: white;
  font-size: 1rem;
  font-weight: 600;
}

.notes-content {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

.notes-content :deep(a) {
  color: #6366f1;
  text-decoration: underline;
}

.update-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.progress-section {
  margin-top: 1rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #22c55e);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.no-info {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.no-info p {
  margin: 0;
  font-weight: 500;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .modal-header {
    padding: 1rem;
    margin: -1rem -1rem 1rem;
  }

  .modal-body {
    padding: 0 1rem 1rem;
  }

  .update-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .version-info {
    padding: 0.75rem;
  }
}
</style>