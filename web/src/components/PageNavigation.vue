<template>
  <div class="bg-base-200 border-t border-base-300 px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Page Tabs -->
      <div class="flex items-center gap-2 flex-1 overflow-x-auto">
        <div
          v-for="page in visiblePages"
          :key="page.id"
          :class="[
            'px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap',
            page.id === currentPage?.id
              ? 'bg-primary text-primary-content shadow-md'
              : 'bg-base-100 text-base-content hover:bg-base-300'
          ]"
          @click="selectPage(page.id)"
        >
          {{ page.name }}
        </div>
      </div>

      <!-- Add Page Button -->
      <button
        @click="showAddPageModal = true"
        class="btn btn-circle btn-ghost btn-sm ml-2"
        title="Añadir página"
      >
        <Plus :size="16" />
      </button>
    </div>

    <!-- Page Counter -->
    <div class="text-xs text-base-content/60 mt-2 text-center">
      Página {{ currentPageIndex + 1 }} de {{ visiblePages.length }}
    </div>
  </div>

  <!-- Add Page Modal -->
  <div v-if="showAddPageModal" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Añadir Nueva Página</h3>

      <div class="form-control w-full mb-4">
        <label class="label">
          <span class="label-text">Nombre de la página</span>
        </label>
        <input
          v-model="newPageName"
          type="text"
          placeholder="Ej: Juegos, Música, Trabajo..."
          class="input input-bordered input-sm w-full"
          @keyup.enter="createPage"
        />
      </div>

      <div class="form-control mb-4">
        <label class="label cursor-pointer">
          <span class="label-text">Es una carpeta</span>
          <input
            v-model="isFolder"
            type="checkbox"
            class="checkbox checkbox-primary"
          />
        </label>
        <div class="label">
          <span class="label-text-alt text-base-content/60">
            Las carpetas no aparecen en la navegación y sirven para organizar acciones
          </span>
        </div>
      </div>

      <div class="modal-action">
        <button
          @click="showAddPageModal = false"
          class="btn btn-ghost"
        >
          Cancelar
        </button>
        <button
          @click="createPage"
          :disabled="!newPageName.trim()"
          class="btn btn-primary"
        >
          Crear Página
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus } from 'lucide-vue-next'
import type { PageData } from '../types/streamdeck'

interface Props {
  currentPage: PageData | null
  pages: PageData[]
}

interface Emits {
  (e: 'page-selected', pageId: string): void
  (e: 'page-created', name: string, isFolder: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Modal state
const showAddPageModal = ref(false)
const newPageName = ref('')
const isFolder = ref(false)

// Computed
const visiblePages = computed(() => {
  return props.pages.filter(page => page.is_folder === 0)
})

const currentPageIndex = computed(() => {
  return visiblePages.value.findIndex(page => page.id === props.currentPage?.id)
})

// Functions
const selectPage = (pageId: string) => {
  emit('page-selected', pageId)
}

const createPage = async () => {
  if (!newPageName.value.trim()) return

  try {
    emit('page-created', newPageName.value.trim(), isFolder.value)

    // Reset modal
    newPageName.value = ''
    isFolder.value = false
    showAddPageModal.value = false
  } catch (error) {
    console.error('Failed to create page:', error)
  }
}
</script>