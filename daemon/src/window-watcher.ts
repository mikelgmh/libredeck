import { EventEmitter } from 'events'

interface WindowInfo {
  hwnd: string
  title: string
  processId: number
  processName: string
  executablePath: string
}

interface AutoSwitchRule {
  id: string
  profileId: string
  executablePath?: string
  processName?: string
  windowTitleFilter?: string
  enabled: boolean
}

class WindowWatcher extends EventEmitter {
  private activeWindow: WindowInfo | null = null
  private intervalId: NodeJS.Timeout | null = null
  private rules: AutoSwitchRule[] = []
  private isWatching = false
  private currentProfileId: string | null = null

  constructor() {
    super()
  }

  startWatching(rules: AutoSwitchRule[] = []) {
    if (this.isWatching) return

    this.rules = rules
    this.isWatching = true

    // Check every 500ms for window changes
    this.intervalId = setInterval(async () => {
      try {
        const currentWindow = await this.getActiveWindow()

        if (this.hasWindowChanged(currentWindow)) {
          this.activeWindow = currentWindow
          
          this.emit('window-changed', currentWindow)

          // Check if we need to switch profiles
          const matchingRule = this.findMatchingRule(currentWindow)
          
          if (matchingRule) {
            this.emit('profile-switch', matchingRule.profileId, currentWindow)
          } else {
            // No matching rule found, check if we should switch to default profile
            this.checkDefaultProfileSwitch(currentWindow)
          }
        }
      } catch (error) {
        console.error('Error in window watcher:', error)
      }
    }, 500)
  }

  stopWatching() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isWatching = false
    this.activeWindow = null
  }

  updateRules(rules: AutoSwitchRule[]) {
    this.rules = rules
  }

  setCurrentProfile(profileId: string) {
    this.currentProfileId = profileId
  }

  isActive(): boolean {
    return this.isWatching
  }

  private hasWindowChanged(newWindow: WindowInfo | null): boolean {
    if (!this.activeWindow && !newWindow) return false
    if (!this.activeWindow || !newWindow) return true

    return this.activeWindow.hwnd !== newWindow.hwnd ||
           this.activeWindow.title !== newWindow.title
  }

  private findMatchingRule(window: WindowInfo | null): AutoSwitchRule | null {
    if (!window) return null

    return this.rules.find(rule => {
      if (!rule.enabled) return false

      // Check executable path
      if (rule.executablePath && window.executablePath !== rule.executablePath) {
        return false
      }

      // Check process name
      if (rule.processName && window.processName !== rule.processName) {
        return false
      }

      // Check window title filter (regex or substring)
      if (rule.windowTitleFilter) {
        try {
          // Try as regex first
          const regex = new RegExp(rule.windowTitleFilter, 'i')
          if (!regex.test(window.title)) {
            return false
          }
        } catch {
          // If not valid regex, use as substring
          if (!window.title.toLowerCase().includes(rule.windowTitleFilter.toLowerCase())) {
            return false
          }
        }
      }

      return true
    }) || null
  }

  private async checkDefaultProfileSwitch(window: WindowInfo | null) {
    console.log('Checking for default profile switch...');
    try {
      // Get default profile from database
      const response = await fetch('http://localhost:3001/api/v1/profiles')
      if (response.ok) {
        const profiles = await response.json()
        const defaultProfile = profiles.find((p: any) => {
          let data = p.data
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data)
            } catch {
              data = {}
            }
          }
          return data?.isDefault === true
        })
        
        if (defaultProfile && defaultProfile.id !== this.currentProfileId) {
          this.emit('profile-switch', defaultProfile.id, window)
        }
      }
    } catch (error) {
      // Ignore errors when checking default profile
    }
  }

  private async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      const response = await fetch('http://localhost:3001/api/v1/windows/active')
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to get active window:', error)
    }
    return null
  }
}

// Singleton instance
export const windowWatcher = new WindowWatcher()
export type { WindowInfo, AutoSwitchRule }