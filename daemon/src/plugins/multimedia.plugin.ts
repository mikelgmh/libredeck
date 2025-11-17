/**
 * Native Multimedia Plugin
 * Provides multimedia control actions (play, pause, volume, etc.)
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class MultimediaPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    /**
     * Plugin metadata
     */
    public getManifest() {
        return {
            id: 'multimedia',
            name: 'Multimedia Controls',
            version: '1.0.0',
            description: 'Control media playback and system volume',
            author: 'LibreDeck',
            native: true,
            actions: [
                {
                    id: 'multimedia',
                    name: 'Multimedia Control',
                    description: 'Control media playback (play, pause, volume, etc.)',
                    schema: {
                        type: 'object',
                        properties: {
                            action: {
                                type: 'string',
                                enum: ['play', 'pause', 'playpause', 'stop', 'next', 'previous', 'volumeup', 'volumedown', 'mute'],
                                description: 'The multimedia action to perform'
                            }
                        },
                        required: ['action']
                    }
                }
            ]
        }
    }

    /**
     * Get action handlers
     */
    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('multimedia', this.executeMultimediaAction.bind(this))
        return handlers
    }

    /**
     * Execute multimedia action
     */
    private async executeMultimediaAction(params: any, context: any): Promise<any> {
        const { action } = params

        // Normalizar el nombre de la acción (convertir a lowercase para comparación)
        const normalizedAction = action?.toLowerCase() || ''

        this.context.log('info', `Multimedia action: ${action}`, { normalizedAction })

        // Detectar sistema operativo
        const isWindows = process.platform === 'win32'
        const isMac = process.platform === 'darwin'
        const isLinux = process.platform === 'linux'

        if (isWindows) {
            return await this.executeWindowsMultimedia(normalizedAction)
        } else if (isMac) {
            return await this.executeMacMultimedia(normalizedAction)
        } else if (isLinux) {
            return await this.executeLinuxMultimedia(normalizedAction)
        } else {
            throw new Error(`Unsupported platform: ${process.platform}`)
        }
    }

    /**
     * Execute multimedia actions on Windows using PowerShell
     */
    private async executeWindowsMultimedia(action: string): Promise<any> {
        const command = 'powershell.exe'
        let args: string[] = []

        // Códigos de teclas multimedia de Windows
        switch (action) {
            case 'mute':
            case 'volumemute':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]173)']
                break
            case 'volumeup':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]175)']
                break
            case 'volumedown':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]174)']
                break
            case 'playpause':
            case 'play':
            case 'pause':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]179)']
                break
            case 'next':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]176)']
                break
            case 'prev':
            case 'previous':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]177)']
                break
            case 'stop':
                args = ['-Command', '(New-Object -ComObject WScript.Shell).SendKeys([char]178)']
                break
            default:
                throw new Error(`Unknown multimedia action: ${action}`)
        }

        try {
            const proc = Bun.spawn({
                cmd: [command, ...args],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            await proc.exited

            this.context.log('info', `Multimedia action executed: ${action}`, { exitCode: proc.exitCode })

            return {
                action,
                executed: true,
                exitCode: proc.exitCode,
                platform: 'windows'
            }
        } catch (error) {
            this.context.log('error', `Multimedia action failed: ${error}`, { action })
            throw error
        }
    }

    /**
     * Execute multimedia actions on macOS using osascript/AppleScript
     */
    private async executeMacMultimedia(action: string): Promise<any> {
        const command = 'osascript'
        let args: string[] = []

        switch (action) {
            case 'mute':
            case 'volumemute':
                args = ['-e', 'set volume output muted true']
                break
            case 'volumeup':
                args = ['-e', 'set volume output volume (output volume of (get volume settings) + 10)']
                break
            case 'volumedown':
                args = ['-e', 'set volume output volume (output volume of (get volume settings) - 10)']
                break
            case 'playpause':
            case 'play':
            case 'pause':
                args = ['-e', 'tell application "System Events" to key code 49'] // Space bar
                break
            case 'next':
                args = ['-e', 'tell application "System Events" to key code 124'] // Right arrow
                break
            case 'previous':
                args = ['-e', 'tell application "System Events" to key code 123'] // Left arrow
                break
            default:
                throw new Error(`Unknown multimedia action: ${action}`)
        }

        try {
            const proc = Bun.spawn({
                cmd: [command, ...args],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            await proc.exited

            this.context.log('info', `Multimedia action executed: ${action}`, { exitCode: proc.exitCode })

            return {
                action,
                executed: true,
                exitCode: proc.exitCode,
                platform: 'macos'
            }
        } catch (error) {
            this.context.log('error', `Multimedia action failed: ${error}`, { action })
            throw error
        }
    }

    /**
     * Execute multimedia actions on Linux using pactl/playerctl
     */
    private async executeLinuxMultimedia(action: string): Promise<any> {
        let command: string
        let args: string[] = []

        switch (action) {
            case 'mute':
            case 'volumemute':
                command = 'pactl'
                args = ['set-sink-mute', '@DEFAULT_SINK@', 'toggle']
                break
            case 'volumeup':
                command = 'pactl'
                args = ['set-sink-volume', '@DEFAULT_SINK@', '+5%']
                break
            case 'volumedown':
                command = 'pactl'
                args = ['set-sink-volume', '@DEFAULT_SINK@', '-5%']
                break
            case 'playpause':
            case 'play':
            case 'pause':
                command = 'playerctl'
                args = ['play-pause']
                break
            case 'next':
                command = 'playerctl'
                args = ['next']
                break
            case 'previous':
                command = 'playerctl'
                args = ['previous']
                break
            case 'stop':
                command = 'playerctl'
                args = ['stop']
                break
            default:
                throw new Error(`Unknown multimedia action: ${action}`)
        }

        try {
            const proc = Bun.spawn({
                cmd: [command, ...args],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            await proc.exited

            this.context.log('info', `Multimedia action executed: ${action}`, { exitCode: proc.exitCode })

            return {
                action,
                executed: true,
                exitCode: proc.exitCode,
                platform: 'linux'
            }
        } catch (error) {
            this.context.log('error', `Multimedia action failed: ${error}`, { action })
            throw error
        }
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        // Cleanup if needed
    }
}
