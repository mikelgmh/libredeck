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
        <button @click="copyUrl" class="modal-action">
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
import { ref, computed, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { Copy } from 'lucide-vue-next'

const dialog = ref<HTMLDialogElement | null>(null)

const networkUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:4321'
})

const showModal = () => {
  dialog.value?.showModal()
}

const closeModal = () => {
  dialog.value?.close()
}

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(networkUrl.value)
    // TODO: Mostrar toast de confirmación
    console.log('URL copiada al portapapeles')
  } catch (error) {
    console.error('Error al copiar URL:', error)
  }
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

defineExpose({
  showModal,
  closeModal
})
</script>

<style scoped>
/* Variables */
.qr-modal {
  --modal-bg: oklch(var(--b1));
  --modal-shadow: rgba(0, 0, 0, 0.1);
  --primary-color: oklch(var(--p));
  --text-color: oklch(var(--bc));
  --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
  --transition-duration: 0.5s;
}

/* Modal Dialog */
.qr-modal {
  border: none;
  border-radius: 1rem;
  padding: 0;
  background: var(--modal-bg);
  max-width: 90vw;
  width: 28rem;
  opacity: 0;
  transform: scale(0.95) translateY(-1rem);
  transition: opacity var(--transition-duration) var(--transition-timing),
    transform var(--transition-duration) var(--transition-timing),
    overlay var(--transition-duration) var(--transition-timing) allow-discrete,
    display var(--transition-duration) var(--transition-timing) allow-discrete;
}

.qr-modal[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
  box-shadow: 0 20px 25px -5px var(--modal-shadow),
    0 8px 10px -6px var(--modal-shadow);
}

@starting-style {
  .qr-modal[open] {
    opacity: 0;
    transform: scale(0.95) translateY(-1rem);
  }
}

/* Backdrop styles */
.qr-modal::backdrop {
  background: radial-gradient(
    circle at center,
    rgba(0, 0, 0, 0.2),
    rgba(0, 0, 0, 0.4)
  );
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity var(--transition-duration) var(--transition-timing),
    display var(--transition-duration) allow-discrete,
    overlay var(--transition-duration) allow-discrete;
}

.qr-modal[open]::backdrop {
  opacity: 1;
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
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.modal-text {
  color: oklch(var(--bc) / 0.7);
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
  background: oklch(var(--b2));
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.url-display code {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--text-color);
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
  background-color: var(--primary-color);
  color: oklch(var(--pc));
}

.modal-action:hover {
  opacity: 0.9;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.modal-close {
  background-color: oklch(var(--b3));
  color: var(--text-color);
}

.modal-close:hover {
  background-color: oklch(var(--b2));
}
</style>
