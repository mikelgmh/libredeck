/**
 * Native Utility Plugin
 * Utility actions like delay, sequence, etc.
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class UtilityPlugin {
    private context: PluginContext
    private executeAction?: (action: any, context: any) => Promise<any>

    constructor(context: PluginContext) {
        this.context = context
    }

    public setActionExecutor(executor: (action: any, context: any) => Promise<any>) {
        this.executeAction = executor
    }

    public getManifest() {
        return {
            id: 'utility',
            name: 'Utility Actions',
            version: '1.0.0',
            description: 'Utility actions for delays, sequences, and more',
            author: 'LibreDeck',
            native: true,
            actions: [
                {
                    id: 'delay',
                    name: 'Delay',
                    description: 'Wait for a specified duration',
                    schema: {
                        type: 'object',
                        properties: {
                            duration: {
                                type: 'number',
                                description: 'Delay duration in milliseconds',
                                default: 1000,
                                minimum: 0
                            }
                        }
                    }
                },
                {
                    id: 'sequence',
                    name: 'Sequence',
                    description: 'Execute multiple actions in sequence',
                    schema: {
                        type: 'object',
                        properties: {
                            actions: {
                                type: 'array',
                                description: 'Array of actions to execute',
                                items: { type: 'object' },
                                default: []
                            },
                            failFast: {
                                type: 'boolean',
                                description: 'Stop on first failure',
                                default: false
                            }
                        },
                        required: ['actions']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('delay', this.executeDelayAction.bind(this))
        handlers.set('sequence', this.executeSequenceAction.bind(this))
        return handlers
    }

    private async executeDelayAction(params: any, context: any): Promise<any> {
        const { duration = 1000 } = params

        this.context.log('info', `Delaying for ${duration}ms`)

        await new Promise(resolve => setTimeout(resolve, duration))

        return { delayed: duration }
    }

    private async executeSequenceAction(params: any, context: any): Promise<any> {
        const { actions = [], failFast = false } = params

        if (!this.executeAction) {
            throw new Error('Action executor not set for sequence plugin')
        }

        this.context.log('info', `Executing sequence of ${actions.length} actions`, { failFast })

        const results = []

        for (let i = 0; i < actions.length; i++) {
            const subAction = actions[i]

            try {
                const result = await this.executeAction(subAction, context)
                results.push(result)

                // Stop sequence if any action fails and failFast is true
                if (!result.success && failFast) {
                    this.context.log('warn', `Sequence stopped at action ${i + 1} due to failure`, { failFast })
                    break
                }
            } catch (error) {
                this.context.log('error', `Sequence action ${i + 1} failed: ${error}`)
                results.push({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                })

                if (failFast) {
                    break
                }
            }
        }

        return { results, totalActions: actions.length, completedActions: results.length }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}
