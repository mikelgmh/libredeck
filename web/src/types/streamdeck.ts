export interface ProfileData {
    id: string
    name: string
    created_at: number
    updated_at: number
    data: any
}

export interface PageData {
    id: string
    profile_id: string
    name: string
    order_idx: number
    is_folder: number // 1 = folder, 0 = page
    data: any
}

export interface ButtonEntity {
    id: string
    page_id: string
    position: number
    data: ButtonData
}

export interface ButtonData {
    label: string
    textTop?: string
    textBottom?: string
    fontSize?: number
    emoji: string
    icon?: string
    backgroundColor: string
    textColor: string
    actions: ActionConfig[]
    backgroundImage?: string
}

export interface ActionConfig {
    id: string
    type: ActionType
    parameters: Record<string, any>
}

export type ActionType = 'shell' | 'http' | 'hotkey' | 'multimedia' | 'page'
