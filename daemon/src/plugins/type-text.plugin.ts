/**
 * Native Type Text Plugin
 * Simulate typing text on the keyboard
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class TypeTextPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'type-text',
            name: 'Type Text',
            version: '1.0.0',
            description: 'Simulate typing text on the keyboard',
            author: 'LibreDeck',
            permissions: ['keyboard', 'input'],
            actions: [
                {
                    id: 'type',
                    name: 'Type Text',
                    description: 'Simulate typing text character by character',
                    icon: 'Type',
                    schema: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                description: 'Text to type',
                                default: ''
                            },
                            delay: {
                                type: 'number',
                                description: 'Delay between keystrokes in milliseconds',
                                default: 0,
                                minimum: 0,
                                maximum: 1000
                            }
                        },
                        required: ['text']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('type', this.executeTypeAction.bind(this))
        return handlers
    }

    private async executeTypeAction(params: any, context: any): Promise<any> {
        const { text, delay = 0 } = params

        if (!text) {
            throw new Error('Text is required for type action')
        }

        this.context.log('info', `Typing text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)

        const isWindows = process.platform === 'win32'
        const isMac = process.platform === 'darwin'
        const isLinux = process.platform === 'linux'

        if (isWindows) {
            return await this.executeWindowsType(text, delay)
        } else if (isMac) {
            return await this.executeMacType(text, delay)
        } else if (isLinux) {
            return await this.executeLinuxType(text, delay)
        } else {
            throw new Error(`Text typing not supported on platform: ${process.platform}`)
        }
    }

    private async executeWindowsType(text: string, delay: number): Promise<any> {
        this.context.log('info', 'Executing Windows text typing', { textLength: text.length, delay })

        try {
            // Escapar caracteres especiales para PowerShell
            const escapedText = text
                .replace(/'/g, "''")
                .replace(/\n/g, '{ENTER}')
                .replace(/\t/g, '{TAB}')

            if (delay > 0) {
                // Si hay delay, escribir carácter por carácter
                const chars = text.split('')
                for (const char of chars) {
                    const escapedChar = char
                        .replace(/'/g, "''")
                        .replace(/\n/g, '{ENTER}')
                        .replace(/\t/g, '{TAB}')

                    const psCommand = `(New-Object -ComObject WScript.Shell).SendKeys('${escapedChar}')`

                    const proc = Bun.spawn({
                        cmd: ['powershell.exe', '-Command', psCommand],
                        stdio: ['ignore', 'pipe', 'pipe']
                    })

                    await proc.exited

                    if (delay > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay))
                    }
                }
            } else {
                // Sin delay, escribir todo de una vez
                const psCommand = `(New-Object -ComObject WScript.Shell).SendKeys('${escapedText}')`

                const proc = Bun.spawn({
                    cmd: ['powershell.exe', '-Command', psCommand],
                    stdio: ['ignore', 'pipe', 'pipe']
                })

                const stderr = await new Response(proc.stderr).text()
                await proc.exited

                if (proc.exitCode !== 0) {
                    throw new Error(`PowerShell failed: ${stderr}`)
                }
            }

            this.context.log('info', 'Windows text typing executed successfully', {
                textLength: text.length,
                delay
            })

            return {
                text: text.substring(0, 100),
                textLength: text.length,
                delay,
                simulated: true,
                platform: 'windows',
                method: 'powershell-sendkeys'
            }
        } catch (error) {
            this.context.log('error', `Windows text typing failed: ${error}`, { textLength: text.length })
            throw error
        }
    }

    private async executeMacType(text: string, delay: number): Promise<any> {
        this.context.log('info', 'Executing macOS text typing', { textLength: text.length, delay })

        try {
            // Escapar comillas para AppleScript
            const escapedText = text.replace(/"/g, '\\"').replace(/\\/g, '\\\\')

            if (delay > 0) {
                // Con delay, escribir carácter por carácter
                const chars = text.split('')
                for (const char of chars) {
                    const escapedChar = char.replace(/"/g, '\\"').replace(/\\/g, '\\\\')
                    const appleScript = `tell application "System Events" to keystroke "${escapedChar}"`

                    const proc = Bun.spawn({
                        cmd: ['osascript', '-e', appleScript],
                        stdio: ['ignore', 'pipe', 'pipe']
                    })

                    await proc.exited

                    if (delay > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay))
                    }
                }
            } else {
                // Sin delay, escribir todo de una vez
                const appleScript = `tell application "System Events" to keystroke "${escapedText}"`

                const proc = Bun.spawn({
                    cmd: ['osascript', '-e', appleScript],
                    stdio: ['ignore', 'pipe', 'pipe']
                })

                const stderr = await new Response(proc.stderr).text()
                await proc.exited

                if (proc.exitCode !== 0) {
                    throw new Error(`osascript failed: ${stderr}`)
                }
            }

            this.context.log('info', 'macOS text typing executed successfully', {
                textLength: text.length,
                delay
            })

            return {
                text: text.substring(0, 100),
                textLength: text.length,
                delay,
                simulated: true,
                platform: 'macos',
                method: 'osascript-keystroke'
            }
        } catch (error) {
            this.context.log('error', `macOS text typing failed: ${error}`, { textLength: text.length })
            throw error
        }
    }

    private async executeLinuxType(text: string, delay: number): Promise<any> {
        this.context.log('info', 'Executing Linux text typing', { textLength: text.length, delay })

        try {
            if (delay > 0) {
                // Con delay, escribir carácter por carácter
                const chars = text.split('')
                for (const char of chars) {
                    const proc = Bun.spawn({
                        cmd: ['xdotool', 'type', '--', char],
                        stdio: ['ignore', 'pipe', 'pipe']
                    })

                    await proc.exited

                    if (delay > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay))
                    }
                }
            } else {
                // Sin delay, escribir todo de una vez
                const proc = Bun.spawn({
                    cmd: ['xdotool', 'type', '--', text],
                    stdio: ['ignore', 'pipe', 'pipe']
                })

                const stderr = await new Response(proc.stderr).text()
                await proc.exited

                if (proc.exitCode !== 0) {
                    // Intentar con ydotool como alternativa
                    try {
                        const proc2 = Bun.spawn({
                            cmd: ['ydotool', 'type', text],
                            stdio: ['ignore', 'pipe', 'pipe']
                        })

                        await proc2.exited

                        if (proc2.exitCode !== 0) {
                            throw new Error('ydotool also failed')
                        }

                        this.context.log('info', 'Linux text typing executed with ydotool', {
                            textLength: text.length,
                            delay
                        })

                        return {
                            text: text.substring(0, 100),
                            textLength: text.length,
                            delay,
                            simulated: true,
                            platform: 'linux',
                            method: 'ydotool'
                        }
                    } catch (ydotoolError) {
                        throw new Error(`Both xdotool and ydotool failed: ${stderr}`)
                    }
                }
            }

            this.context.log('info', 'Linux text typing executed successfully', {
                textLength: text.length,
                delay
            })

            return {
                text: text.substring(0, 100),
                textLength: text.length,
                delay,
                simulated: true,
                platform: 'linux',
                method: 'xdotool'
            }
        } catch (error) {
            this.context.log('error', `Linux text typing failed: ${error}`, { textLength: text.length })
            throw error
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}
