<template>
  <dialog ref="dialog" class="qr-modal">
    <div class="modal-content">
      <h2 class="modal-title">Escanea para acceder</h2>
      
      <p class="modal-text">
        Escanea este código QR con tu dispositivo móvil para acceder a LibreDeck desde la red local.
      </p>
      
      <div class="qr-container">
        <div v-if="isLoadingIP" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Obteniendo dirección IP...</p>
        </div>
        <QrcodeVue 
          v-else
          :value="networkUrl" 
          :size="280" 
          level="M"
          render-as="svg"
          :margin="2"
        />
      </div>
      
      <div class="url-display">
        <code v-if="!isLoadingIP">{{ networkUrl }}</code>
        <code v-else>Cargando...</code>
      </div>
      
      <div class="modal-buttons">
        <button @click="copyUrl" class="modal-action mt-0" :disabled="isLoadingIP">
          <Copy :size="16" />
          {{ isLoadingIP ? 'Cargando...' : 'Copiar URL' }}
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
  if (isLoadingIP.value) {
    console.log('Aún cargando la IP...')
    return
  }
  
  try {
    await navigator.clipboard.writeText(networkUrl.value)
    console.log('URL copiada al portapapeles')
  } catch (error) {
    console.error('Error al copiar URL:', error)
  }
}

// Obtener la URL actual del navegador con IP de red local si está disponible
const networkUrl = ref('')
const isLoadingIP = ref(true)

const getLocalIP = () => {
  return new Promise<string>((resolve, reject) => {
    // Si ya tenemos una IP que no es localhost, usarla
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      resolve(window.location.hostname)
      return
    }

    // Usar WebRTC para obtener la IP local
    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('')
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate
        const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/)
        if (ipMatch && ipMatch[1] !== '127.0.0.1') {
          resolve(ipMatch[1])
          pc.close()
        }
      }
    }
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(reject)
    
    // Timeout después de 3 segundos
    setTimeout(() => {
      reject(new Error('Timeout getting local IP'))
    }, 3000)
  })
}

onMounted(async () => {
  try {
    const localIP = await getLocalIP()
    networkUrl.value = `${window.location.protocol}//${localIP}:${window.location.port}`
  } catch (error) {
    // Fallback a localhost si no se puede obtener la IP local
    console.warn('Could not get local IP, using localhost:', error)
    networkUrl.value = window.location.origin
  } finally {
    isLoadingIP.value = false
  }
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
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading Container */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
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

.modal-action:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.modal-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.modal-close {
  background-color: #4b5563;
  color: white;
}

.modal-close:hover {
  background-color: #374151;
}
</style>
