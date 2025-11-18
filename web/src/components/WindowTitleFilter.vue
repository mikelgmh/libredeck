<template>
  <div class="window-title-filter">
    <h6 class="text-sm font-medium text-base-content mb-2">Filtro de título de ventana</h6>

    <div class="filter-input">
      <input
        v-model="filterValue"
        type="text"
        placeholder="Ej: Chrome, Visual Studio Code, .* - Google Chrome"
        class="input input-bordered input-sm w-full"
        @input="handleInput"
      />
    </div>

    <div class="filter-help">
      <p class="text-xs text-base-content/60 mb-2">
        Puedes usar texto simple o expresiones regulares (regex).
      </p>
      <div class="examples">
        <div class="example">
          <code class="text-xs">Chrome</code>
          <span class="text-xs text-base-content/60">→ Coincide con cualquier ventana que contenga "Chrome"</span>
        </div>
        <div class="example">
          <code class="text-xs">.* - Google Chrome</code>
          <span class="text-xs text-base-content/60">→ Regex que coincide con títulos que terminan en " - Google Chrome"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const filterValue = ref(props.modelValue || '')

const handleInput = () => {
  emit('update:modelValue', filterValue.value)
  emit('update')
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  filterValue.value = newValue || ''
})
</script>

<style scoped>
.window-title-filter {
  padding: 0.75rem;
  background-color: hsl(var(--b2));
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--b3));
}

.filter-input {
  margin-bottom: 0.75rem;
}

.filter-help {
  border-top: 1px solid hsl(var(--b3));
  padding-top: 0.75rem;
}

.examples {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.example {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.example code {
  background-color: hsl(var(--b1));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
}
</style>