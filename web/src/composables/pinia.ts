import { createPinia } from 'pinia'
import { markRaw } from 'vue'

// Crear instancia de Pinia
const pinia = createPinia()

// Configurar para desarrollo
if (import.meta.env.DEV) {
  pinia.use(({ store }) => {
    store.$subscribe((mutation, state) => {
      console.log('📦 Store updated:', store.$id, mutation, state)
    })
  })
}

export default pinia