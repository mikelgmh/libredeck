<template>
  <div class="form-control w-full">
    <div class="label">
      <span class="label-text">Icono</span>
    </div>
    
    <!-- Selected Icon Display -->
    <div class="flex gap-2">
      <button
        type="button"
        @click="isOpen = !isOpen"
        class="btn btn-outline btn-sm flex-1 justify-start"
      >
        <component v-if="selectedIcon" :is="selectedIcon" :size="20" />
        <span v-else>Seleccionar icono...</span>
      </button>
      
      <button
        v-if="modelValue"
        type="button"
        @click="clearIcon"
        class="btn btn-ghost btn-sm btn-square"
        title="Limpiar icono"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- Icon Picker Modal -->
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="isOpen = false">
      <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" @click.stop>
        <!-- Header -->
        <div class="p-4 border-b border-base-300">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold">Seleccionar Icono</h3>
            <button @click="isOpen = false" class="btn btn-ghost btn-sm btn-square">
              <X :size="20" />
            </button>
          </div>
          
          <!-- Search -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar iconos..."
            class="input input-bordered input-sm w-full"
            @input="handleSearch"
          />
        </div>

        <!-- Icon Grid -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-8 gap-2">
            <button
              v-for="iconName in filteredIcons"
              :key="iconName"
              type="button"
              @click="selectIcon(iconName)"
              class="btn btn-ghost btn-sm aspect-square p-2 hover:btn-primary"
              :class="{ 'btn-primary': modelValue === iconName }"
              :title="iconName"
            >
              <component :is="icons[iconName]" :size="24" />
            </button>
          </div>
          
          <div v-if="filteredIcons.length === 0" class="text-center text-base-content/50 py-8">
            No se encontraron iconos
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-base-300 text-sm text-base-content/70">
          {{ filteredIcons.length }} iconos disponibles
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'

interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = ref(false)
const searchQuery = ref('')

// Importar todos los iconos de lucide-vue-next
const icons = LucideIcons as Record<string, any>

// Lista de nombres de iconos (excluyendo componentes internos)
const allIconNames = Object.keys(icons).filter(name => 
  name !== 'default' && 
  name !== 'createLucideIcon' &&
  name !== 'dynamicIconImports' &&
  name !== 'icons' &&
  !name.startsWith('Lucide') &&
  typeof icons[name] !== 'string' &&
  icons[name] !== null &&
  icons[name] !== undefined
)

// Iconos filtrados por búsqueda
const filteredIcons = computed(() => {
  if (!searchQuery.value) {
    return allIconNames.slice(0, 200) // Mostrar solo primeros 200 por performance
  }
  
  const query = searchQuery.value.toLowerCase()
  return allIconNames
    .filter(name => name.toLowerCase().includes(query))
    .slice(0, 200)
})

// Icono seleccionado actualmente
const selectedIcon = computed(() => {
  if (!props.modelValue) return null
  return icons[props.modelValue] || null
})

const handleSearch = () => {
  // La búsqueda es reactiva gracias al computed
}

const selectIcon = (iconName: string) => {
  emit('update:modelValue', iconName)
  isOpen.value = false
}

const clearIcon = () => {
  emit('update:modelValue', '')
}

const { X } = LucideIcons
</script>

<style scoped>
/* Transiciones suaves para el modal */
</style>
