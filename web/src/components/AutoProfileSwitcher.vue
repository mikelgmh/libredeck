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
                v-model:executable-path="rule.executablePath"
                v-model:process-name="rule.processName"
                @update="updateRule(rule)"
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
import { ref, computed, watch } from 'vue'
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
  profile: ProfileData
  availableProfiles: ProfileData[]
}

interface Emits {
  (e: 'config-updated', config: { enabled: boolean; rules: AutoSwitchRule[] }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const autoSwitchEnabled = ref(false)
const rules = ref<AutoSwitchRule[]>([])

// Load existing configuration
const loadConfiguration = () => {
  const profileData = props.profile.data
  if (typeof profileData === 'string') {
    try {
      const parsed = JSON.parse(profileData)
      autoSwitchEnabled.value = parsed.autoSwitchEnabled || false
      rules.value = parsed.autoSwitchRules || []
    } catch {
      autoSwitchEnabled.value = false
      rules.value = []
    }
  } else {
    autoSwitchEnabled.value = profileData?.autoSwitchEnabled || false
    rules.value = profileData?.autoSwitchRules || []
  }
}

// Save configuration
const saveConfiguration = () => {
  const profileData = {
    ...(typeof props.profile.data === 'string'
      ? JSON.parse(props.profile.data)
      : props.profile.data),
    autoSwitchEnabled: autoSwitchEnabled.value,
    autoSwitchRules: rules.value
  }

  emit('config-updated', {
    enabled: autoSwitchEnabled.value,
    rules: rules.value
  })
}

const handleToggleAutoSwitch = () => {
  saveConfiguration()
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

// Load configuration when profile changes
watch(() => props.profile, (newProfile, oldProfile) => {
  // Stop watcher for old profile
  if (oldProfile && autoSwitchEnabled.value) {
    autoProfileSwitcher.stopWatcher()
  }
  
  // Load new configuration
  loadConfiguration()
  
  // Start watcher for new profile if enabled
  if (autoSwitchEnabled.value) {
    autoProfileSwitcher.startWatcher(rules.value)
  }
}, { immediate: true })

// Cleanup on unmount
import { onUnmounted } from 'vue'
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