/**
 * Native Open App Plugin
 * Open applications or files
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class OpenAppPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'open-app',
            name: 'Abrir Aplicación',
            version: '1.0.0',
            description: 'Abre aplicaciones o archivos en el sistema',
            author: 'LibreDeck',
            permissions: ['filesystem', 'process'],
            actions: [
                {
                    id: 'open-app',
                    name: 'Abrir Aplicación/Archivo',
                    description: 'Abre una aplicación o archivo seleccionado',
                    icon: 'AppWindow',
                    schema: {
                        type: 'object',
                        properties: {
                            path: {
                                type: 'string',
                                description: 'Ruta completa al archivo o aplicación a abrir'
                            }
                        },
                        required: ['path']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('open-app', this.executeOpenAppAction.bind(this))
        return handlers
    }

    private async executeOpenAppAction(params: any, context: any): Promise<any> {
        const { path } = params

        if (!path) {
            throw new Error('Path is required for open-app action')
        }

        this.context.log('info', `Opening application/file: ${path}`)

        try {
            // On Windows, use 'start' command to open files/applications
            const proc = Bun.spawn({
                cmd: ['cmd', '/c', 'start', '""', path],
                stdio: ['ignore', 'pipe', 'pipe']
            })

            const output = await new Response(proc.stdout).text()
            const error = await new Response(proc.stderr).text()

            await proc.exited

            this.context.log('info', `Open app command completed: ${path}`, {
                exitCode: proc.exitCode,
                hasOutput: !!output,
                hasError: !!error
            })

            return {
                stdout: output,
                stderr: error,
                exitCode: proc.exitCode
            }
        } catch (error) {
            this.context.log('error', `Open app failed: ${error}`, { path })
            throw new Error(`Failed to open application: ${error}`)
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}