/**
 * Native Utility Plugin
 * Utility actions like delay, etc.
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class UtilityPlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public setActionExecutor(executor: (action: any, context: any) => Promise<any>) {
        // Not used
    }

    public getManifest() {
        return {
            id: 'utility',
            name: 'Utility Actions',
            version: '1.0.0',
            description: 'Utility actions for delays and more',
            author: 'LibreDeck',
            permissions: ['system', 'utility'],
            actions: [
                {
                    id: 'delay',
                    name: 'Delay',
                    description: 'Wait for a specified duration',
                    icon: 'Clock',
                    schema: {
                        type: 'object',
                        properties: {
                            duration: {
                                type: 'number',
                                title: 'Duración (milisegundos)',
                                description: 'Delay duration in milliseconds',
                                default: 1000,
                                minimum: 0,
                                maximum: 60000,
                                ui: {
                                    component: 'input',
                                    type: 'number',
                                    min: 0,
                                    max: 60000,
                                    placeholder: '1000'
                                }
                            }
                        }
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('delay', this.executeDelayAction.bind(this))
        return handlers
    }

    private async executeDelayAction(params: any, context: any): Promise<any> {
        const { duration = 1000 } = params

        this.context.log('info', `Delaying for ${duration}ms`)

        await new Promise(resolve => setTimeout(resolve, duration))

        return { delayed: duration }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}
