<template>
  <div
    v-if="show && items.length > 0"
    ref="contextMenuRef"
    class="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-1 min-w-48 z-10000"
    :style="{ top: adjustedY + 'px', left: adjustedX + 'px' }"
    @click.stop
  >
    <button
      v-for="item in items"
      :key="item.id"
      @click="handleItemClick(item)"
      :class="[
        'w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2 text-sm',
        item.danger ? 'text-error' : ''
      ]"
    >
      <component :is="item.icon" :size="16" />
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import type { Component } from 'vue'

interface MenuItem {
  id: string
  label: string
  icon: Component
  danger?: boolean
}

interface Props {
  show: boolean
  x: number
  y: number
  items: MenuItem[]
}

interface Emits {
  (e: 'item-click', item: MenuItem): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const contextMenuRef = ref<HTMLElement | null>(null)

// Calculate adjusted position to prevent menu from going off-screen
const adjustedX = computed(() => {
  if (!contextMenuRef.value) return props.x
  
  const menuWidth = contextMenuRef.value.offsetWidth || 150 // fallback width
  const viewportWidth = window.innerWidth
  
  if (props.x + menuWidth > viewportWidth) {
    return Math.max(0, props.x - menuWidth)
  }
  
  return Math.max(0, props.x)
})

const adjustedY = computed(() => {
  if (!contextMenuRef.value) return props.y
  
  const menuHeight = contextMenuRef.value.offsetHeight || (props.items.length * 40) // fallback height
  const viewportHeight = window.innerHeight
  
  if (props.y + menuHeight > viewportHeight) {
    return Math.max(0, props.y - menuHeight)
  }
  
  return Math.max(0, props.y)
})

// Handle item click
const handleItemClick = (item: MenuItem) => {
  emit('item-click', item)
  emit('close')
}

// Close context menu on click outside
const handleClickOutside = (event: MouseEvent) => {
  if (props.show && contextMenuRef.value && !contextMenuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

// Close context menu on Escape key
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.show) {
    emit('close')
  }
}

onMounted(() => {
  // Use nextTick to ensure the menu is rendered before adding click listener
  nextTick(() => {
    document.addEventListener('click', handleClickOutside)
  })
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
/* Improve button hover states */
button:hover {
  background-color: hsl(var(--b2)) !important;
}
</style>