/**
 * Browser Navigation Plugin
 * Open URLs in the default system browser
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class BrowserPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'browser',
            name: 'Browser Navigation',
            version: '1.0.0',
            description: 'Open URLs in the default system browser',
            author: 'LibreDeck',
            permissions: ['system', 'browser'],
            actions: [
                {
                    id: 'open-url',
                    name: 'Open URL',
                    description: 'Open a URL in the default browser',
                    icon: 'Globe',
                    schema: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                title: 'URL',
                                description: 'The URL to open',
                                format: 'uri',
                                ui: {
                                    component: 'input',
                                    type: 'url',
                                    placeholder: 'https://example.com'
                                }
                            }
                        },
                        required: ['url']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('open-url', this.openUrl.bind(this))
        return handlers
    }

    private async openUrl(params: any, context: any): Promise<any> {
        const { url } = params

        if (!url) {
            throw new Error('URL is required')
        }

        this.context.log('info', `Opening URL: ${url}`)

        // Detect platform
        const platform = process.platform
        let command: string
        let args: string[]

        if (platform === 'win32') {
            command = 'cmd.exe'
            args = ['/c', 'start', url]
        } else if (platform === 'darwin') {
            command = 'open'
            args = [url]
        } else if (platform === 'linux') {
            command = 'xdg-open'
            args = [url]
        } else {
            throw new Error(`Unsupported platform: ${platform}`)
        }

        try {
            const proc = Bun.spawn({
                cmd: [command, ...args],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            await proc.exited

            this.context.log('info', `URL opened successfully: ${url}`, { exitCode: proc.exitCode, platform })

            return {
                url,
                opened: true,
                exitCode: proc.exitCode,
                platform
            }
        } catch (error) {
            this.context.log('error', `Failed to open URL: ${error}`, { url })
            throw error
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}