// Type definitions for Pio (Paul_Pio) plugin
// Generated from public/assets/live2d/static/pio.js

declare namespace Pio {
  export type Mode = 'static' | 'fixed' | 'draggable'

  export interface CustomItem {
    // CSS selector to bind hover/read/link handlers
    selector: string
    // optional type hint used by the plugin ('read'|'link' etc.)
    type?: 'read' | 'link' | string
    // optional text to show when hovered
    text?: string
  }

  export interface Content {
    welcome?: string | string[]
    referer?: string
    touch?: string | string[]
    home?: string
    link?: string
    close?: string
    // skin is used as an array of messages: [hoverText, clickText]
    skin?: string[]
    // custom hover handlers
    custom?: CustomItem[]
  }

  export interface Options {
    // required: array of model json paths
    model: string[]
    // plugin mode (determines drag/static/fixed behavior)
    mode?: Mode
    // initial hidden state (if true, plugin starts hidden)
    hidden?: boolean
    // whether to use tips/time-based welcome messages
    tips?: boolean
    // night can be a function to toggle theme, or a string to eval
    night?: (() => void) | string
    // localization / textual content
    content?: Content
  }

  export interface MessageOptions {
    time?: number
    html?: boolean
  }

  export interface Instance {
    // initialize plugin; if `noModel` true, skip loading model
    init(noModel?: boolean): void
    // set hidden state and wire up "show" button
    initHidden(): void
    // destroy / hide the plugin
    destroy(): void
    // show message in plugin dialog
    message(text: string | string[], options?: MessageOptions): void
  }
}

// Constructor exposed by pio.js
declare const Paul_Pio: new (prop: Pio.Options) => Pio.Instance
declare const PaulPio: typeof Paul_Pio
declare const Pio: typeof Paul_Pio

interface Window {
  Paul_Pio?: typeof Paul_Pio
  PaulPio?: typeof Paul_Pio
  Pio?: typeof Paul_Pio
  __PIO_INSTANCE?: Pio.Instance
  __PAUL_PIO?: typeof Paul_Pio
}

export as namespace Pio
export = Pio
