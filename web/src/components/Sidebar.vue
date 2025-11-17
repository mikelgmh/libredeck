<template>
  <div class="w-80 bg-base-200 border-r border-base-300 flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-base-300">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Grid3x3 :size="18" class="text-primary-content" />
        </div>
        <div>
          <h1 class="text-lg font-bold">LibreDeck</h1>
          <div class="flex items-center gap-2 text-sm">
            <div :class="['w-2 h-2 rounded-full', connectionStatus]"></div>
            <span class="text-base-content/70">{{ connectionText }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Profile Selector -->
    <ProfileSelector 
      :profiles="profiles"
      :selectedProfile="selectedProfile"
      @profile-changed="$emit('profile-changed', $event)"
      @profile-created="$emit('profile-created', $event)"
    />

    <!-- Button Configuration or Actions Library -->
    <div class="flex-1 p-4 overflow-y-auto">
      <!-- Selected Button Info -->
      <div v-if="selectedButton !== null">
        <div class="mb-4">
          <h3 class="text-base font-semibold mb-2">
            Botón {{ selectedButton + 1 }}
          </h3>
          
          <ButtonEditor
            :buttonConfig="buttonConfig"
            @update:label="$emit('update-button-label', $event)"
            @update:emoji="$emit('update-button-emoji', $event)"
            @update:backgroundColor="$emit('update-button-background-color', $event)"
            @update:textColor="$emit('update-button-text-color', $event)"
            @add-action="$emit('add-action', $event)"
            @remove-action="$emit('remove-action', $event)"
            @update-action-parameter="(...args) => $emit('update-action-parameter', args)"
          />
        </div>
      </div>

      <!-- Actions Library (when no button selected) -->
      <div v-else>
        <ActionsLibrary :plugins="plugins" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Grid3x3 } from 'lucide-vue-next'
import ProfileSelector from './ProfileSelector.vue'
import ButtonEditor from './ButtonEditor.vue'
import ActionsLibrary from './ActionsLibrary.vue'
import type { ProfileData, ButtonData } from '../types/streamdeck'

interface Props {
  connectionStatus: string
  connectionText: string
  profiles: ProfileData[]
  selectedProfile: string
  selectedButton: number | null
  buttonConfig: ButtonData
  plugins: any[]
}

interface Emits {
  (e: 'profile-changed', profileId: string): void
  (e: 'profile-created', name: string): Promise<void>
  (e: 'update-button-label', value: string): void
  (e: 'update-button-emoji', value: string): void
  (e: 'update-button-background-color', value: string): void
  (e: 'update-button-text-color', value: string): void
  (e: 'add-action', type: string): void
  (e: 'remove-action', index: number): void
  (e: 'update-action-parameter', args: [number, string, any]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>