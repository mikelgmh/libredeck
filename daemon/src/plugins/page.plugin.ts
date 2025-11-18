/**
 * Page Navigation Plugin
 * Navigate to different pages within the application
 */

export interface PluginContext {
    log: (level: string, message: string, meta?: any) => void
}

export interface ActionHandler {
    (params: any, context: any): Promise<any>
}

export class PagePlugin {
    private context: PluginContext

    constructor(context: PluginContext) {
        this.context = context
    }

    public getManifest() {
        return {
            id: 'page',
            name: 'Page Navigation',
            version: '1.0.0',
            description: 'Navigate to different pages within LibreDeck',
            author: 'LibreDeck',
            permissions: ['navigation', 'ui'],
            actions: [
                {
                    id: 'page',
                    name: 'Navigate to Page',
                    description: 'Switch to a different page',
                    icon: 'FileText',
                    schema: {
                        type: 'object',
                        properties: {
                            pageId: {
                                type: 'string',
                                title: 'Página',
                                description: 'The ID of the page to navigate to',
                                ui: {
                                    component: 'page-select',
                                    placeholder: 'Seleccionar página...'
                                }
                            },
                            pageName: {
                                type: 'string',
                                title: 'Nombre de página',
                                description: 'The name of the page (for display purposes)',
                                ui: {
                                    component: 'hidden' // Auto-populated when pageId changes
                                }
                            }
                        },
                        required: ['pageId']
                    }
                }
            ]
        }
    }

    public getActionHandlers(): Map<string, ActionHandler> {
        const handlers = new Map<string, ActionHandler>()
        handlers.set('page', this.navigateToPage.bind(this))
        return handlers
    }

    private async navigateToPage(params: any, context: any): Promise<any> {
        const { pageId, pageName } = params

        if (!pageId) {
            throw new Error('Page ID is required')
        }

        this.context.log('info', `Navigating to page: ${pageName || pageId}`, { pageId, context })

        // Return special result that indicates page navigation
        // The ActionRunner can detect this and send a WebSocket event
        return {
            success: true,
            pageId,
            pageName,
            action: 'navigate_to_page',
            navigated: true
        }
    }

    public dispose(): void {
        // Cleanup if needed
    }
}