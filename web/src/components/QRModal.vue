<template>
  <dialog ref="dialog" class="qr-modal">
    <div class="modal-content">
      <h2 class="modal-title">Escanea para acceder</h2>
      
      <p class="modal-text">
        Escanea este código QR con tu dispositivo móvil para acceder a LibreDeck desde la red local.
      </p>
      
      <div class="qr-container">
        <QrcodeVue 
          :value="networkUrl" 
          :size="280" 
          level="M"
          render-as="svg"
          :margin="2"
        />
      </div>
      
      <div class="url-display">
        <code>{{ networkUrl }}</code>
      </div>
      
      <div class="modal-buttons">
        <button @click="copyUrl" class="modal-action mt-0">
          <Copy :size="16" />
          Copiar URL
        </button>
        <button @click="closeModal" class="modal-close">
          Cerrar
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { Copy } from 'lucide-vue-next'

const dialog = ref<HTMLDialogElement | null>(null)
const isClosing = ref(false)

const showModal = () => {
  isClosing.value = false
  dialog.value?.showModal()
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

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(networkUrl.value)
    console.log('URL copiada al portapapeles')
  } catch (error) {
    console.error('Error al copiar URL:', error)
  }
}

// Obtener la URL actual del navegador
const networkUrl = ref('')
onMounted(() => {
  networkUrl.value = window.location.origin
})

defineExpose({
  showModal,
  closeModal
})
</script>

<style scoped>
/* Modal Dialog */
.qr-modal {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  padding: 0;
  background-color: #1f2937;
  max-width: 90vw;
  width: 28rem;
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

.qr-modal[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.qr-modal.closing {
  opacity: 0;
  transform: scale(0.95) translateY(-1rem);
}

@starting-style {
  .qr-modal[open] {
    opacity: 0;
    transform: scale(0.95) translateY(-1rem);
  }
}

/* Backdrop styles */
.qr-modal::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    display 0.5s allow-discrete,
    overlay 0.5s allow-discrete;
}

.qr-modal[open]::backdrop {
  opacity: 1;
}

.qr-modal.closing::backdrop {
  opacity: 0;
}

@starting-style {
  .qr-modal[open]::backdrop {
    opacity: 0;
  }
}

/* Modal Content */
.modal-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
  background-color: #1f2937;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #f9fafb;
  margin: 0;
  text-align: center;
  width: 100%;
}

.modal-text {
  color: #d1d5db;
  line-height: 1.6;
  margin: 0;
  text-align: center;
}

/* QR Container */
.qr-container {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* URL Display */
.url-display {
  width: 100%;
  background: #374151;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.url-display code {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #f9fafb;
  word-break: break-all;
}

/* Buttons */
.modal-buttons {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  justify-content: center;
}

.modal-action,
.modal-close {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-action:hover,
.modal-close:hover {
  transform: translateY(-1px);
}

.modal-action:active,
.modal-close:active {
  transform: translateY(0);
}

.modal-action {
  background-color: #3b82f6;
  color: white;
}

.modal-action:hover {
  opacity: 0.9;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.modal-close {
  background-color: #4b5563;
  color: white;
}

.modal-close:hover {
  background-color: #374151;
}
</style>
