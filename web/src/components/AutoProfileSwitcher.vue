<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-base-content">Cambio Automático de Perfil</h3>
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">Activar cambio automático</span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            v-model="autoSwitchEnabled"
            @change="handleToggleAutoSwitch"
          />
        </label>
      </div>
    </div>

    <div v-if="autoSwitchEnabled" class="space-y-4">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-md font-medium text-base-content">Reglas de Cambio</h4>
          <button
            @click="addNewRule"
            class="btn btn-primary btn-sm"
          >
            <Plus :size="16" class="mr-2" />
            Nueva Regla
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(rule, index) in rules"
            :key="rule.id"
            class="bg-base-100 rounded-lg p-4 border border-base-300"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-base-content">Regla {{ index + 1 }}</span>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="toggle toggle-sm toggle-primary"
                  v-model="rule.enabled"
                  @change="updateRule(rule)"
                />
                <button
                  @click="removeRule(rule.id)"
                  class="btn btn-ghost btn-xs text-error"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text text-sm">Perfil a activar</span>
                </label>
                <select
                  v-model="rule.profileId"
                  @change="updateRule(rule)"
                  class="select select-bordered select-sm"
                >
                  <option value="">Seleccionar perfil...</option>
                  <option
                    v-for="profile in availableProfiles"
                    :key="profile.id"
                    :value="profile.id"
                  >
                    {{ profile.name }}
                  </option>
                </select>
              </div>

              <h5 class="text-sm font-medium text-base-content mb-2">Activar cuando:</h5>

              <!-- Executable Selector -->
              <ExecutableSelector
                :executable-path="rule.executablePath"
                :process-name="rule.processName"
                @update:modelValue="updateExecutableForRule(rule, $event)"
              />

              <!-- Window Title Filter -->
              <WindowTitleFilter
                v-model="rule.windowTitleFilter"
                @update="updateRule(rule)"
              />
            </div>
          </div>

          <div v-if="rules.length === 0" class="text-center py-8">
            <p class="text-base-content/60 text-sm">
              No hay reglas configuradas. Crea una regla para activar el cambio automático.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import ExecutableSelector from './ExecutableSelector.vue'
import WindowTitleFilter from './WindowTitleFilter.vue'
import { autoProfileSwitcher } from '../composables/useAutoProfileSwitcher'
import type { ProfileData } from '../types/streamdeck'

interface AutoSwitchRule {
  id: string
  profileId: string
  executablePath?: string
  processName?: string
  windowTitleFilter?: string
  enabled: boolean
}

interface Props {
  availableProfiles: ProfileData[]
}

interface Emits {
  (e: 'config-updated', config: { enabled: boolean; rules: AutoSwitchRule[] }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const autoSwitchEnabled = ref(false)
const rules = ref<AutoSwitchRule[]>([])

// API Base URL - Use dynamic hostname for network access
const API_BASE = `http://${window.location.hostname}:3001/api/v1`

// Load existing configuration from global settings
const loadConfiguration = async () => {
  try {
    const response = await fetch(`${API_BASE}/settings?key=autoProfileSwitch`)
    if (response.ok) {
      const data = await response.json()
      if (data.value) {
        const config = JSON.parse(data.value)
        autoSwitchEnabled.value = config.enabled || false
        rules.value = config.rules || []
      }
    }
  } catch (error) {
    console.error('Failed to load auto-profile configuration:', error)
    autoSwitchEnabled.value = false
    rules.value = []
  }
}

// Save configuration to global settings
const saveConfiguration = async () => {
  try {
    const config = {
      enabled: autoSwitchEnabled.value,
      rules: rules.value
    }

    await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'autoProfileSwitch',
        value: JSON.stringify(config)
      })
    })

    emit('config-updated', config)
  } catch (error) {
    console.error('Failed to save auto-profile configuration:', error)
  }
}

const handleToggleAutoSwitch = async () => {
  await saveConfiguration()
  if (autoSwitchEnabled.value) {
    autoProfileSwitcher.startWatcher(rules.value)
  } else {
    autoProfileSwitcher.stopWatcher()
  }
}

const addNewRule = () => {
  const newRule: AutoSwitchRule = {
    id: `rule_${Date.now()}`,
    profileId: '',
    enabled: true
  }
  rules.value.push(newRule)
  saveConfiguration()
  if (autoSwitchEnabled.value) {
    autoProfileSwitcher.updateRules(rules.value)
  }
}

const removeRule = (ruleId: string) => {
  const index = rules.value.findIndex(r => r.id === ruleId)
  if (index > -1) {
    rules.value.splice(index, 1)
    saveConfiguration()
    if (autoSwitchEnabled.value) {
      autoProfileSwitcher.updateRules(rules.value)
    }
  }
}

const updateRule = (updatedRule: AutoSwitchRule) => {
  const index = rules.value.findIndex(r => r.id === updatedRule.id)
  if (index > -1) {
    rules.value[index] = { ...updatedRule }
    saveConfiguration()
    if (autoSwitchEnabled.value) {
      autoProfileSwitcher.updateRules(rules.value)
    }
  }
}

const updateExecutableForRule = (rule: AutoSwitchRule, executableData: { executablePath?: string; processName?: string }) => {
  rule.executablePath = executableData.executablePath
  rule.processName = executableData.processName
  updateRule(rule)
}

// Load configuration on mount
onMounted(async () => {
  await loadConfiguration()
  if (autoSwitchEnabled.value) {
    autoProfileSwitcher.startWatcher(rules.value)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (autoSwitchEnabled.value) {
    autoProfileSwitcher.stopWatcher()
  }
})

defineExpose({
  autoSwitchEnabled,
  rules
})
</script>