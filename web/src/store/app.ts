import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppMode = 'edit' | 'deck'

export const useAppStore = defineStore('app', () => {
  const mode = ref<AppMode>('edit')

  const setMode = (newMode: AppMode) => {
    mode.value = newMode
  }

  const toggleMode = () => {
    mode.value = mode.value === 'edit' ? 'deck' : 'edit'
  }

  return {
    mode,
    setMode,
    toggleMode
  }
})