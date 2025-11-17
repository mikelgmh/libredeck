/**
 * Native Plugins Index
 * Exports all native plugins that come bundled with LibreDeck
 */

import { MultimediaPlugin } from './multimedia.plugin'
import { ShellPlugin } from './shell.plugin'
import { HttpPlugin } from './http.plugin'
import { UtilityPlugin } from './utility.plugin'
import { HotkeyPlugin } from './hotkey.plugin'

export interface NativePlugin {
    getManifest(): any
    getActionHandlers(): Map<string, any>
    dispose(): void
}

/**
 * Get all native plugins
 */
export function getNativePlugins(): NativePlugin[] {
    return [
        // Plugins are loaded by ActionRunner
    ]
}

/**
 * Create a native plugin instance with context
 */
export function createNativePlugin(pluginClass: any, context: any): NativePlugin {
    return new pluginClass(context)
}

// Export plugin classes
export {
    MultimediaPlugin,
    ShellPlugin,
    HttpPlugin,
    UtilityPlugin,
    HotkeyPlugin
}