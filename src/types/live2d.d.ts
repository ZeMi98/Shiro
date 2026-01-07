// Pio-specific types (merged from src/types/pio.d.ts)
declare namespace Pio {
  export type Mode = 'static' | 'fixed' | 'draggable'

  export interface CustomItem {
    selector: string
    type?: 'read' | 'link' | string
    text?: string
  }

  export interface Content {
    welcome?: string | string[]
    referer?: string
    touch?: string | string[]
    home?: string
    link?: string
    close?: string
    skin?: string[]
    custom?: CustomItem[]
    [key: string]: any
  }

  export interface Options {
    model: string[]
    mode?: Mode
    hidden?: boolean
    tips?: boolean
    night?: (() => void) | string
    content?: Content
    [key: string]: any
  }

  export interface MessageOptions {
    time?: number
    html?: boolean
  }

  export interface Instance {
    init(noModel?: boolean): void
    initHidden(): void
    destroy(): void
    message(text: string | string[], options?: MessageOptions): void
    [key: string]: any
  }
}

/** Live2D widget configuration interface (compatible with Pio.Options) */
interface Live2DConfig extends Pio.Options {}

/** Live2D widget instance interface (compatible with Pio.Instance) */
interface Live2DInstance extends Pio.Instance {
  /** Additional generic methods commonly exposed */
  show?(): void
  hide?(): void
  loadModel?(modelPath: string): void | Promise<void>
  getModel?(): string | null
  speak?(text: string): void
}

/** Live2D widget constructor */
interface Live2DConstructor {
  new (config: Live2DConfig): Live2DInstance
  prototype: Live2DInstance
}

declare global {
  interface Window {
    Paul_Pio?: Live2DConstructor
    PaulPio?: Live2DConstructor
    Pio?: Live2DConstructor
    __PAUL_PIO?: Live2DConstructor
    __PIO_INSTANCE?: Live2DInstance
  }
}

/** Global Paul_Pio constructor reference */
declare let Paul_Pio: Live2DConstructor | undefined

export type { Live2DConfig, Live2DConstructor,Live2DInstance }
