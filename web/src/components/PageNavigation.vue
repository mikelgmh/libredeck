<template>
  <div class="bg-base-200 border-t border-base-300 px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Page Tabs -->
      <div class="flex items-center gap-2 flex-1 overflow-x-auto">
        <div
          v-for="page in visiblePages"
          :key="page.id"
          class="relative group"
        >
          <div
            :class="[
              'px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap pr-8',
              page.id === currentPage?.id
                ? 'bg-primary text-primary-content shadow-md'
                : 'bg-base-100 text-base-content hover:bg-base-300'
            ]"
            @click="selectPage(page.id)"
          >
            {{ page.name }}
          </div>
          
          <!-- Menu Button -->
          <button
            @click.stop="showPageMenu($event, page)"
            class="absolute right-1 top-1/2 -translate-y-1/2  transition-opacity duration-200 btn btn-ghost btn-xs btn-square"
          >
            <MoreVertical :size="14"  />
          </button>
        </div>
      </div>

      <!-- Add Page Button -->
      <button
        @click="showAddPageModal = true"
        class="btn btn-circle btn-ghost btn-sm ml-2"
        :title="t('pageNavigation.addPage')"
      >
        <Plus :size="16" />
      </button>
    </div>

    <!-- Page Counter -->
    <div class="text-xs text-base-content/60 mt-2 text-center">
      {{ t('pageNavigation.pageCounter', { current: currentPageIndex + 1, total: visiblePages.length }) }}
    </div>

    <!-- Context Menu -->
    <ContextMenu
      :show="pageMenu.show"
      :x="pageMenu.x"
      :y="pageMenu.y"
      :items="pageMenuItems"
      @item-click="handlePageMenuItem"
      @close="hidePageMenu"
    />

    <!-- Rename Modal -->
    <div v-if="renameModal.show" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ t('pageNavigation.renamePage') }}</h3>

        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">{{ t('pageNavigation.newName') }}</span>
          </label>
          <input
            v-model="renameModal.newName"
            type="text"
            :placeholder="t('pageNavigation.pageNamePlaceholder')"
            class="input input-bordered input-sm w-full"
            @keyup.enter="confirmRename"
          />
        </div>

        <div class="modal-action">
          <button
            @click="hideRenameModal"
            class="btn btn-ghost"
          >
            {{ t('pageNavigation.cancel') }}
          </button>
          <button
            @click="confirmRename"
            :disabled="!renameModal.newName.trim()"
            class="btn btn-primary"
          >
            {{ t('pageNavigation.rename') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Page Modal -->
    <div v-if="showAddPageModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ t('pageNavigation.addNewPage') }}</h3>

        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">{{ t('pageNavigation.pageName') }}</span>
          </label>
          <input
            v-model="newPageName"
            type="text"
            :placeholder="t('pageNavigation.pageNameExamples')"
            class="input input-bordered input-sm w-full"
            @keyup.enter="createPage"
          />
        </div>

        <div class="form-control mb-4">
          <label class="label cursor-pointer">
            <span class="label-text">{{ t('pageNavigation.isFolder') }}</span>
            <input
              v-model="isFolder"
              type="checkbox"
              class="checkbox checkbox-primary"
            />
          </label>
          <div class="label">
            <span class="label-text-alt text-base-content/60">
              {{ t('pageNavigation.folderDescription') }}
            </span>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="showAddPageModal = false"
            class="btn btn-ghost"
          >
            {{ t('pageNavigation.cancel') }}
          </button>
          <button
            @click="createPage"
            :disabled="!newPageName.trim()"
            class="btn btn-primary"
          >
            {{ t('pageNavigation.createPage') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18nStore } from '../composables/useI18n'
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-vue-next'
import ContextMenu from './ContextMenu.vue'
import type { PageData } from '../types/streamdeck'

const { t } = useI18nStore()

interface Props {
  currentPage: PageData | null
  pages: PageData[]
}

interface Emits {
  (e: 'page-selected', pageId: string): void
  (e: 'page-created', name: string, isFolder: boolean): void
  (e: 'page-deleted', pageId: string): void
  (e: 'page-renamed', pageId: string, newName: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Modal state
const showAddPageModal = ref(false)
const newPageName = ref('')
const isFolder = ref(false)

// Page menu state
const pageMenu = ref({
  show: false,
  x: 0,
  y: 0,
  page: null as PageData | null
})

// Page menu items
const pageMenuItems = computed(() => [
  {
    id: 'rename',
    label: t('pageNavigation.rename'),
    icon: Edit,
    danger: false
  },
  {
    id: 'delete',
    label: t('pageNavigation.delete'),
    icon: Trash2,
    danger: true
  }
])

// Rename modal state
const renameModal = ref({
  show: false,
  page: null as PageData | null,
  newName: ''
})

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

// Page menu functions
const showPageMenu = (event: MouseEvent, page: PageData) => {
  event.preventDefault()
  event.stopPropagation()

  const rect = (event.target as HTMLElement).getBoundingClientRect()
  
  // Calculate position - prefer showing below, but show above if not enough space
  const menuHeight = 80 // approximate menu height
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  
  let y: number
  if (spaceBelow >= menuHeight) {
    // Enough space below
    y = rect.bottom + 4
  } else if (spaceAbove >= menuHeight) {
    // Enough space above
    y = rect.top - menuHeight - 4
  } else {
    // Not enough space either way, prefer below
    y = rect.bottom + 4
  }
  
  pageMenu.value = {
    show: true,
    x: rect.left,
    y: y,
    page
  }
}

const hidePageMenu = () => {
  pageMenu.value.show = false
}

const handlePageMenuItem = (item: any) => {
  if (!pageMenu.value.page) return

  switch (item.id) {
    case 'rename':
      showRenameModal(pageMenu.value.page)
      break
    case 'delete':
      emit('page-deleted', pageMenu.value.page.id)
      break
  }
  hidePageMenu()
}

// Rename modal functions
const showRenameModal = (page: PageData) => {
  renameModal.value = {
    show: true,
    page,
    newName: page.name
  }
}

const hideRenameModal = () => {
  renameModal.value.show = false
  renameModal.value.page = null
  renameModal.value.newName = ''
}

const confirmRename = () => {
  if (!renameModal.value.page || !renameModal.value.newName.trim()) return

  emit('page-renamed', renameModal.value.page.id, renameModal.value.newName.trim())
  hideRenameModal()
}
</script>