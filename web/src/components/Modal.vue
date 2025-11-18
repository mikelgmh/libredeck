<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-content">
      <slot />
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

defineExpose({
  showModal,
  closeModal
})
</script>

<style scoped>
/* Modal Dialog */
.modal {
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

.modal[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.modal.closing {
  opacity: 0;
  transform: scale(0.95) translateY(-1rem);
}

@starting-style {
  .modal[open] {
    opacity: 0;
    transform: scale(0.95) translateY(-1rem);
  }
}

/* Backdrop styles */
.modal::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    display 0.5s allow-discrete,
    overlay 0.5s allow-discrete;
}

.modal[open]::backdrop {
  opacity: 1;
}

.modal.closing::backdrop {
  opacity: 0;
}

@starting-style {
  .modal[open]::backdrop {
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
</style>