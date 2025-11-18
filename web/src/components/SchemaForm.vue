<template>
  <div class="space-y-2" data-swapy-no-drag>
    <!-- Render each property based on its schema -->
    <div
      v-for="(property, propKey) in schemaProperties"
      :key="propKey"
      class="form-field"
    >
      <!-- String input -->
      <div v-if="property.ui?.component === 'input' && property.ui.type === 'text'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <input
            :value="modelValue[propKey] || property.default || ''"
            @input="updateValue(propKey, ($event.target as HTMLInputElement).value)"
            :type="property.ui.type"
            :placeholder="property.ui.placeholder"
            class="input input-bordered input-xs w-full"
            data-swapy-no-drag
          />
        </label>
      </div>

      <!-- URL input -->
      <div v-else-if="property.ui?.component === 'input' && property.ui.type === 'url'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <input
            :value="modelValue[propKey] || property.default || ''"
            @input="updateValue(propKey, ($event.target as HTMLInputElement).value)"
            :type="property.ui.type"
            :placeholder="property.ui.placeholder"
            class="input input-bordered input-xs w-full"
            data-swapy-no-drag
          />
        </label>
      </div>

      <!-- Number input -->
      <div v-else-if="property.ui?.component === 'input' && property.ui.type === 'number'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <input
            :value="modelValue[propKey] || property.default || 0"
            @input="updateValue(propKey, parseInt(($event.target as HTMLInputElement).value) || 0)"
            :type="property.ui.type"
            :placeholder="property.ui.placeholder"
            :min="property.ui.min"
            :max="property.ui.max"
            class="input input-bordered input-xs w-full"
            data-swapy-no-drag
          />
        </label>
      </div>

      <!-- Textarea -->
      <div v-else-if="property.ui?.component === 'textarea'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <textarea
            :value="modelValue[propKey] || property.default || ''"
            @input="updateValue(propKey, ($event.target as HTMLTextAreaElement).value)"
            :placeholder="property.ui.placeholder"
            :rows="property.ui.rows || 3"
            class="textarea textarea-bordered textarea-xs w-full"
            data-swapy-no-drag
          ></textarea>
        </label>
      </div>

      <!-- Select dropdown -->
      <div v-else-if="property.ui?.component === 'select'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <select
            :value="modelValue[propKey] || property.default || ''"
            @change="updateValue(propKey, ($event.target as HTMLSelectElement).value)"
            class="select select-bordered select-xs w-full"
            data-swapy-no-drag
          >
            <option value="">{{ property.ui.placeholder || 'Seleccionar...' }}</option>
            <option
              v-for="option in property.ui.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <!-- File input with button -->
      <div v-else-if="property.ui?.component === 'file'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <div class="flex gap-2">
            <input
              :value="modelValue[propKey] || property.default || ''"
              @input="updateValue(propKey, ($event.target as HTMLInputElement).value)"
              :type="property.ui.type || 'text'"
              :placeholder="property.ui.placeholder"
              class="input input-bordered input-xs flex-1"
              data-swapy-no-drag
            />
            <button
              @click="openFileDialog(propKey)"
              class="btn btn-ghost btn-xs"
              title="Seleccionar archivo"
              data-swapy-no-drag
            >
              <component :is="FolderOpen" />
            </button>
          </div>
        </label>
      </div>

      <!-- Special case: Page selector -->
      <div v-else-if="property.ui?.component === 'page-select'">
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <select
            :value="modelValue[propKey] || property.default || ''"
            @change="updateValue(propKey, ($event.target as HTMLSelectElement).value)"
            class="select select-bordered select-xs w-full"
            data-swapy-no-drag
          >
            <option value="">{{ property.ui.placeholder || 'Seleccionar página...' }}</option>
            <option
              v-for="page in availablePages"
              :key="page.id"
              :value="page.id"
            >
              {{ page.name }}
            </option>
          </select>
        </label>
        <div v-if="selectedPageName" class="text-xs text-base-content/60 mt-1">
          Navegará a: {{ selectedPageName }}
        </div>
      </div>

      <!-- Hidden field (for internal use) -->
      <div v-else-if="property.ui?.component === 'hidden'">
        <!-- Hidden field, value managed internally -->
      </div>

      <!-- Fallback: Basic input for unknown types -->
      <div v-else>
        <label class="form-control w-full">
          <div class="label">
            <span class="label-text text-xs">{{ property.title || propKey }}</span>
          </div>
          <input
            :value="modelValue[propKey] || property.default || ''"
            @input="updateValue(propKey, ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="property.ui?.placeholder"
            class="input input-bordered input-xs w-full"
            data-swapy-no-drag
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FolderOpen } from 'lucide-vue-next'

interface SchemaProperty {
  type: string
  title?: string
  description?: string
  default?: any
  enum?: string[]
  ui?: {
    component: string
    type?: string
    placeholder?: string
    options?: Array<{ value: any; label: string }>
    min?: number
    max?: number
    rows?: number
  }
}

interface Schema {
  type: 'object'
  properties: Record<string, SchemaProperty>
  required?: string[]
}

interface Props {
  schema: Schema
  modelValue: Record<string, any>
  availablePages?: Array<{ id: string; name: string }>
}

interface Emits {
  (e: 'update:modelValue', value: Record<string, any>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Get only visible properties (not hidden)
const schemaProperties = computed(() => {
  const properties: Record<string, SchemaProperty> = {}

  for (const [key, property] of Object.entries(props.schema.properties)) {
    if (property.ui?.component !== 'hidden') {
      properties[key] = property
    }
  }

  return properties
})

// Get selected page name for display
const selectedPageName = computed(() => {
  if (!props.availablePages || !props.modelValue.pageId) return ''
  const page = props.availablePages.find(p => p.id === props.modelValue.pageId)
  return page ? page.name : ''
})

const updateValue = (key: string, value: any) => {
  // If updating pageId, also update pageName for display
  if (key === 'pageId' && props.availablePages) {
    const page = props.availablePages.find(p => p.id === value)
    if (page) {
      emit('update:modelValue', {
        ...props.modelValue,
        [key]: value,
        pageName: page.name
      })
      return
    }
  }

  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}

const openFileDialog = async (propKey: string) => {
  try {
    // Construir la URL de la API del daemon
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const hostname = window.location.hostname
    const apiUrl = `${protocol}//${hostname}:3001/api/v1/files/select`

    console.log('🔍 Abriendo diálogo de selección de archivos...')

    // Llamar al endpoint que abre el diálogo nativo
    const response = await fetch(apiUrl)

    if (response.ok) {
      const result = await response.json()

      if (result.success && result.path) {
        console.log('✅ Archivo seleccionado:', result.path)
        // Actualizar el campo con la ruta completa
        updateValue(propKey, result.path)

        alert(`Archivo seleccionado exitosamente:\n\n${result.filename}\n\nRuta: ${result.path}`)
      } else {
        console.log('❌ Usuario canceló la selección')
        // No mostrar mensaje de error si el usuario canceló
      }
    } else {
      const errorText = await response.text()
      console.error('❌ Error en selección de archivos:', errorText)
      alert('Error al abrir el diálogo de selección de archivos. Verifica que el daemon esté ejecutándose.')
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error)
    alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}. Verifica que el daemon esté ejecutándose en el puerto 3001.`)
  }
}
</script>