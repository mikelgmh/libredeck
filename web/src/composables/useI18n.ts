import { ref, computed } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '../i18n/messages'

// Create a singleton i18n instance
let i18nInstance: ReturnType<typeof createI18n> | null = null

function getI18nInstance() {
  if (!i18nInstance) {
    i18nInstance = createI18n({
      legacy: false,
      locale: 'es',
      fallbackLocale: 'en',
      messages
    })
  }
  return i18nInstance
}

export function useI18nStore() {
  const i18n = getI18nInstance()
  const { t, locale, availableLocales } = i18n.global

  const currentLocale = computed(() => locale.value)
  const availableLanguages = computed(() => availableLocales)

  const setLocale = (newLocale: string) => {
    locale.value = newLocale
    // Save to localStorage (only in browser)
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale)
    }
  }

  const loadSavedLocale = () => {
    // Only access localStorage in browser
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale')
      if (savedLocale && availableLocales.includes(savedLocale)) {
        locale.value = savedLocale
      }
    }
  }

  return {
    t,
    currentLocale,
    availableLanguages,
    setLocale,
    loadSavedLocale
  }
}