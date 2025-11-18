<template>
  <div class="w-80 bg-base-200 border-l border-base-300 flex flex-col h-screen">
    <!-- Header -->
    <div class="p-4 border-b border-base-300">
      <h2 class="text-lg font-semibold mb-3">Biblioteca de Acciones</h2>
      
      <!-- Search -->
      <div class="form-control">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar acciones..."
          class="input input-bordered input-sm w-full"
        />
      </div>
    </div>

    <!-- Actions List -->
    <div class="flex-1 overflow-y-auto p-4">
      <ActionsLibrary
        :plugins="plugins"
        :search-query="searchQuery"
      />
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-base-300">
      <div class="text-xs text-base-content/70 text-center">
        Biblioteca de acciones dinámicas
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ActionsLibrary from './ActionsLibrary.vue'

interface Props {
  plugins: any[]
}

const props = defineProps<Props>()

const searchQuery = ref('')
</script>

<style scoped>
.action-item {
  user-select: none;
}

.action-item:active {
  opacity: 0.7;
  cursor: grabbing;
}
</style>
