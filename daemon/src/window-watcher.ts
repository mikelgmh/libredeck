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
          console.log('🔄 Window changed detected')
          console.log('📋 Previous window:', this.activeWindow ? {
            title: this.activeWindow.title.substring(0, 50) + (this.activeWindow.title.length > 50 ? '...' : ''),
            processName: this.activeWindow.processName,
            executablePath: this.activeWindow.executablePath?.split('\\').pop() || 'Unknown'
          } : 'None')
          
          this.activeWindow = currentWindow
          
          console.log('🖥️ New active window:', currentWindow ? {
            title: currentWindow.title.substring(0, 50) + (currentWindow.title.length > 50 ? '...' : ''),
            processName: currentWindow.processName,
            executablePath: currentWindow.executablePath?.split('\\').pop() || 'Unknown',
            hwnd: currentWindow.hwnd
          } : 'None')
          
          this.emit('window-changed', currentWindow)

          // Check if we need to switch profiles
          console.log('🔍 Checking for matching auto-switch rules...')
          const matchingRule = this.findMatchingRule(currentWindow)
          
          if (matchingRule) {
            console.log('✅ Found matching rule:', {
              ruleId: matchingRule.id,
              profileId: matchingRule.profileId,
              executablePath: matchingRule.executablePath?.split('\\').pop() || 'Unknown',
              processName: matchingRule.processName,
              windowTitleFilter: matchingRule.windowTitleFilter
            })
            this.emit('profile-switch', matchingRule.profileId, currentWindow)
          } else {
            console.log('❌ No matching auto-switch rule found for current window')
          }
        }
      } catch (error) {
        console.error('❌ Error in window watcher:', error)
      }
    }, 500)

    console.log('🖥️ Window watcher started')
  }

  stopWatching() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isWatching = false
    this.activeWindow = null
    console.log('🖥️ Window watcher stopped')
  }

  updateRules(rules: AutoSwitchRule[]) {
    this.rules = rules
    console.log('📋 Auto-switch rules updated:', rules.map(rule => ({
      id: rule.id,
      profileId: rule.profileId,
      executablePath: rule.executablePath,
      processName: rule.processName,
      windowTitleFilter: rule.windowTitleFilter,
      enabled: rule.enabled
    })))
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