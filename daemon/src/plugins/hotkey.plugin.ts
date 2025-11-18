/**
 * Native Hotkey Plugin
 * Simulate keyboard shortcuts and key presses
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class HotkeyPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'hotkey',
            name: 'Keyboard Shortcuts',
            version: '1.0.0',
            description: 'Simulate keyboard shortcuts and key presses',
            author: 'LibreDeck',
            permissions: ['keyboard', 'input'],
            actions: [
                {
                    id: 'hotkey',
                    name: 'Hotkey',
                    description: 'Simulate a keyboard shortcut',
                    icon: 'Keyboard',
                    schema: {
                        type: 'object',
                        properties: {
                            keys: {
                                type: 'string',
                                description: 'Key to press (e.g., "c", "v", "tab", "f5", "enter")'
                            },
                            modifiers: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    enum: ['ctrl', 'alt', 'shift', 'meta', 'win', 'cmd', 'control', 'option', 'super', 'command']
                                },
                                description: 'Modifier keys (use "meta"/"cmd" for Mac Command, "win"/"super" for Windows key)',
                                default: []
                            }
                        },
                        required: ['keys']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('hotkey', this.executeHotkeyAction.bind(this))
        return handlers
    }

    private async executeHotkeyAction(params: any, context: any): Promise<any> {
        const { keys, modifiers = [] } = params

        if (!keys) {
            throw new Error('Keys are required for hotkey action')
        }

        this.context.log('info', `Simulating hotkey: ${modifiers.join('+')}${modifiers.length ? '+' : ''}${keys}`)

        // TODO: Implement actual hotkey simulation using native libraries
        // Options:
        // - Windows: Use AutoHotkey bindings or SendInput API via FFI
        // - macOS: Use CGEventCreateKeyboardEvent
        // - Linux: Use xdotool or similar

        const isWindows = process.platform === 'win32'
        const isMac = process.platform === 'darwin'
        const isLinux = process.platform === 'linux'

        if (isWindows) {
            return await this.executeWindowsHotkey(keys, modifiers)
        } else if (isMac) {
            return await this.executeMacHotkey(keys, modifiers)
        } else if (isLinux) {
            return await this.executeLinuxHotkey(keys, modifiers)
        } else {
            throw new Error(`Hotkey simulation not supported on platform: ${process.platform}`)
        }
    }

    private async executeWindowsHotkey(keys: string, modifiers: string[]): Promise<any> {
        this.context.log('info', 'Executing Windows hotkey', { keys, modifiers })

        // Mapeo de teclas especiales a códigos VK de Windows
        const keyMap: Record<string, string> = {
            // Letras y números se usan directamente
            'enter': '{ENTER}',
            'return': '{ENTER}',
            'tab': '{TAB}',
            'backspace': '{BACKSPACE}',
            'delete': '{DELETE}',
            'del': '{DELETE}',
            'escape': '{ESC}',
            'esc': '{ESC}',
            'space': ' ',
            'up': '{UP}',
            'down': '{DOWN}',
            'left': '{LEFT}',
            'right': '{RIGHT}',
            'home': '{HOME}',
            'end': '{END}',
            'pageup': '{PGUP}',
            'pagedown': '{PGDN}',
            'insert': '{INSERT}',
            'f1': '{F1}', 'f2': '{F2}', 'f3': '{F3}', 'f4': '{F4}',
            'f5': '{F5}', 'f6': '{F6}', 'f7': '{F7}', 'f8': '{F8}',
            'f9': '{F9}', 'f10': '{F10}', 'f11': '{F11}', 'f12': '{F12}',
        }

        // Construir la combinación de teclas para PowerShell SendKeys
        let keySequence = ''

        // Agregar modificadores
        if (modifiers.includes('ctrl') || modifiers.includes('control')) {
            keySequence += '^'
        }
        if (modifiers.includes('alt')) {
            keySequence += '%'
        }
        if (modifiers.includes('shift')) {
            keySequence += '+'
        }
        if (modifiers.includes('win') || modifiers.includes('meta')) {
            // Windows key no es soportado directamente por SendKeys
            // Usaremos VBScript para simular Windows key
            return await this.executeWindowsKeyWithVBS(keys, modifiers)
        }

        // Agregar la tecla principal
        const normalizedKey = keys.toLowerCase()
        const mappedKey = keyMap[normalizedKey] || keys.toUpperCase()
        keySequence += mappedKey

        try {
            // Usar PowerShell con SendKeys
            const psCommand = `(New-Object -ComObject WScript.Shell).SendKeys('${keySequence}')`

            const proc = Bun.spawn({
                cmd: ['powershell.exe', '-Command', psCommand],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            const stderr = await new Response(proc.stderr).text()
            await proc.exited

            if (proc.exitCode === 0) {
                this.context.log('info', 'Windows hotkey executed successfully', {
                    keys,
                    modifiers,
                    keySequence
                })
                return {
                    keys,
                    modifiers,
                    simulated: true,
                    platform: 'windows',
                    method: 'powershell-sendkeys',
                    keySequence
                }
            } else {
                throw new Error(`PowerShell failed: ${stderr}`)
            }
        } catch (error) {
            this.context.log('error', `Windows hotkey failed: ${error}`, { keys, modifiers })
            throw error
        }
    }

    private async executeWindowsKeyWithVBS(keys: string, modifiers: string[]): Promise<any> {
        // Para combinaciones con tecla Windows, usamos un enfoque alternativo
        // Crear un script VBS temporal
        const vbsScript = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.SendKeys "^{ESC}"
WScript.Sleep 100
        `.trim()

        // Por simplicidad, usamos PowerShell para simular Win key como Ctrl+Esc
        this.context.log('warn', 'Windows key combinations have limited support', { keys, modifiers })

        return {
            keys,
            modifiers,
            simulated: false,
            platform: 'windows',
            error: 'Windows key combinations not fully supported'
        }
    }

    private async executeMacHotkey(keys: string, modifiers: string[]): Promise<any> {
        this.context.log('info', 'Executing macOS hotkey', { keys, modifiers })

        // Mapeo de teclas especiales a key codes de macOS
        const keyCodeMap: Record<string, number> = {
            'a': 0, 'b': 11, 'c': 8, 'd': 2, 'e': 14, 'f': 3, 'g': 5, 'h': 4,
            'i': 34, 'j': 38, 'k': 40, 'l': 37, 'm': 46, 'n': 45, 'o': 31,
            'p': 35, 'q': 12, 'r': 15, 's': 1, 't': 17, 'u': 32, 'v': 9,
            'w': 13, 'x': 7, 'y': 16, 'z': 6,
            '0': 29, '1': 18, '2': 19, '3': 20, '4': 21, '5': 23,
            '6': 22, '7': 26, '8': 28, '9': 25,
            'return': 36, 'enter': 36, 'tab': 48, 'space': 49,
            'delete': 51, 'backspace': 51, 'escape': 53, 'esc': 53,
            'up': 126, 'down': 125, 'left': 123, 'right': 124,
            'f1': 122, 'f2': 120, 'f3': 99, 'f4': 118, 'f5': 96, 'f6': 97,
            'f7': 98, 'f8': 100, 'f9': 101, 'f10': 109, 'f11': 103, 'f12': 111,
            'home': 115, 'end': 119, 'pageup': 116, 'pagedown': 121
        }

        // Mapeo de modificadores a flags de macOS
        const modifierFlags: string[] = []

        if (modifiers.includes('cmd') || modifiers.includes('meta') || modifiers.includes('command')) {
            modifierFlags.push('command down')
        }
        if (modifiers.includes('ctrl') || modifiers.includes('control')) {
            modifierFlags.push('control down')
        }
        if (modifiers.includes('alt') || modifiers.includes('option')) {
            modifierFlags.push('option down')
        }
        if (modifiers.includes('shift')) {
            modifierFlags.push('shift down')
        }

        const normalizedKey = keys.toLowerCase()
        const keyCode = keyCodeMap[normalizedKey]

        if (keyCode === undefined) {
            throw new Error(`Unknown key: ${keys}`)
        }

        try {
            // Construir comando AppleScript
            const modifierString = modifierFlags.length > 0 ? `using {${modifierFlags.join(', ')}}` : ''
            const appleScript = `tell application "System Events" to key code ${keyCode} ${modifierString}`

            const proc = Bun.spawn({
                cmd: ['osascript', '-e', appleScript],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            const stderr = await new Response(proc.stderr).text()
            await proc.exited

            if (proc.exitCode === 0) {
                this.context.log('info', 'macOS hotkey executed successfully', {
                    keys,
                    modifiers,
                    keyCode,
                    modifierFlags
                })
                return {
                    keys,
                    modifiers,
                    simulated: true,
                    platform: 'macos',
                    method: 'osascript-keycode',
                    keyCode,
                    modifierFlags
                }
            } else {
                throw new Error(`osascript failed: ${stderr}`)
            }
        } catch (error) {
            this.context.log('error', `macOS hotkey failed: ${error}`, { keys, modifiers })
            throw error
        }
    }

    private async executeLinuxHotkey(keys: string, modifiers: string[]): Promise<any> {
        this.context.log('info', 'Executing Linux hotkey', { keys, modifiers })

        // Normalizar modificadores para xdotool
        const normalizedModifiers = modifiers.map(mod => {
            const modMap: Record<string, string> = {
                'ctrl': 'ctrl',
                'control': 'ctrl',
                'alt': 'alt',
                'shift': 'shift',
                'meta': 'super',
                'win': 'super',
                'super': 'super',
                'cmd': 'super'
            }
            return modMap[mod.toLowerCase()] || mod
        })

        // Mapeo de nombres de teclas especiales
        const keyMap: Record<string, string> = {
            'return': 'Return',
            'enter': 'Return',
            'backspace': 'BackSpace',
            'delete': 'Delete',
            'del': 'Delete',
            'escape': 'Escape',
            'esc': 'Escape',
            'space': 'space',
            'tab': 'Tab',
            'up': 'Up',
            'down': 'Down',
            'left': 'Left',
            'right': 'Right',
            'home': 'Home',
            'end': 'End',
            'pageup': 'Page_Up',
            'pagedown': 'Page_Down',
            'insert': 'Insert'
        }

        const normalizedKey = keys.toLowerCase()
        const mappedKey = keyMap[normalizedKey] || keys

        // Construir la combinación de teclas
        const keyCombo = [...normalizedModifiers, mappedKey].join('+')

        // Intentar con xdotool primero
        try {
            const proc = Bun.spawn({
                cmd: ['xdotool', 'key', keyCombo],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            const stderr = await new Response(proc.stderr).text()
            await proc.exited

            if (proc.exitCode === 0) {
                this.context.log('info', 'Linux hotkey executed successfully with xdotool', {
                    keys,
                    modifiers,
                    keyCombo
                })
                return {
                    keys,
                    modifiers,
                    simulated: true,
                    platform: 'linux',
                    method: 'xdotool',
                    keyCombo
                }
            } else {
                throw new Error(`xdotool failed: ${stderr}`)
            }
        } catch (xdotoolError) {
            this.context.log('warn', 'xdotool failed, trying ydotool', { error: xdotoolError })

            // Intentar con ydotool como alternativa (para Wayland)
            try {
                const proc = Bun.spawn({
                    cmd: ['ydotool', 'key', keyCombo],
                    stdio: ['ignore', 'pipe', 'pipe']
                })

                await proc.exited

                if (proc.exitCode === 0) {
                    this.context.log('info', 'Linux hotkey executed successfully with ydotool', {
                        keys,
                        modifiers,
                        keyCombo
                    })
                    return {
                        keys,
                        modifiers,
                        simulated: true,
                        platform: 'linux',
                        method: 'ydotool',
                        keyCombo
                    }
                }
            } catch (ydotoolError) {
                this.context.log('error', 'Both xdotool and ydotool failed', {
                    xdotoolError,
                    ydotoolError
                })
                throw new Error('Neither xdotool nor ydotool are available. Please install one of them.')
            }
        }

        return {
            keys,
            modifiers,
            simulated: false,
            platform: 'linux',
            error: 'Failed to simulate hotkey'
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}
