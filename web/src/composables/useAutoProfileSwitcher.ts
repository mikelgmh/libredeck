import { ref, computed } from 'vue'

interface AutoSwitchRule {
  id: string
  profileId: string
  executablePath?: string
  processName?: string
  windowTitleFilter?: string
  enabled: boolean
}

class AutoProfileSwitcher {
  private watcherActive = ref(false)
  private currentRules = ref<AutoSwitchRule[]>([])

  constructor() {
    this.checkWatcherStatus()
  }

  get isActive() {
    return computed(() => this.watcherActive.value)
  }

  get rules() {
    return computed(() => this.currentRules.value)
  }

  async checkWatcherStatus() {
    try {
      const response = await fetch('http://localhost:3001/api/v1/windows/watcher')
      if (response.ok) {
        const status = await response.json()
        this.watcherActive.value = status.isActive
      }
    } catch (error) {
      console.error('Failed to check watcher status:', error)
    }
  }

  async startWatcher(rules: AutoSwitchRule[]) {
    try {
      const response = await fetch('http://localhost:3001/api/v1/windows/watcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          rules
        })
      })

      if (response.ok) {
        this.watcherActive.value = true
        this.currentRules.value = rules
        console.log('Auto profile switcher started')
      }
    } catch (error) {
      console.error('Failed to start watcher:', error)
    }
  }

  async stopWatcher() {
    try {
      const response = await fetch('http://localhost:3001/api/v1/windows/watcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'stop'
        })
      })

      if (response.ok) {
        this.watcherActive.value = false
        this.currentRules.value = []
        console.log('Auto profile switcher stopped')
      }
    } catch (error) {
      console.error('Failed to stop watcher:', error)
    }
  }

  async updateRules(rules: AutoSwitchRule[]) {
    try {
      const response = await fetch('http://localhost:3001/api/v1/windows/watcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          rules
        })
      })

      if (response.ok) {
        this.currentRules.value = rules
        console.log('Auto profile switcher rules updated')
      }
    } catch (error) {
      console.error('Failed to update rules:', error)
    }
  }
}

// Singleton instance
export const autoProfileSwitcher = new AutoProfileSwitcher()
export type { AutoSwitchRule }