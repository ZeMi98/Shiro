'use client'

import * as React from 'react'
import { useEffect, useRef } from 'react'

function isTouchDevice(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    )
  } catch {
    return false
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // in development, append timestamp to bust cache
    const dev = process.env.NODE_ENV !== 'production'
    const finalSrc = dev
      ? `${src}${src.includes('?') ? '&' : '?'}cb=${Date.now()}`
      : src
    if (
      document.querySelector(`script[src="${finalSrc}"]`) ||
      document.querySelector(`script[src="${src}"]`)
    )
      return resolve()
    const s = document.createElement('script')
    s.src = finalSrc
    // ensure scripts execute in insertion order for deterministic init
    s.async = false
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.append(s)
  })
}

function loadCSS(href: string): void {
  const dev = process.env.NODE_ENV !== 'production'
  const finalHref = dev
    ? `${href}${href.includes('?') ? '&' : '?'}cb=${Date.now()}`
    : href
  if (
    document.querySelector(`link[href="${finalHref}"]`) ||
    document.querySelector(`link[href="${href}"]`)
  )
    return
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = finalHref
  document.head.append(l)
}

export default function Live2DWidget(): JSX.Element | null {
  const pioRef = useRef<any | null>(null)
  const initedRef = useRef(false)

  useEffect(() => {
    if (initedRef.current) return

    if (
      isTouchDevice() ||
      (typeof window !== 'undefined' && window.innerWidth < 768)
    ) {
      // Mobile: do not initialize by default
      return
    }

    let mounted = true

    async function init() {
      try {
        // load local assets from public/assets/live2d/static
        console.debug(
          'Live2D: loading CSS and scripts from /assets/live2d/static',
        )
        loadCSS('/assets/live2d/static/pio.css')
        await loadScript('/assets/live2d/static/l2d.js')
        await loadScript('/assets/live2d/static/pio.js')

        // debug: expose constructor if present
        console.debug(
          'Live2D: Paul ctor on window ->',
          (window as any).Paul_Pio ||
            (window as any).PaulPio ||
            (window as any).Pio,
        )
        ;(window as any).__PAUL_PIO =
          (window as any).Paul_Pio ||
          (window as any).PaulPio ||
          (window as any).Pio

        if (!mounted) return

        const Paul =
          (window as any).Paul_Pio ||
          (window as any).PaulPio ||
          (window as any).Pio ||
          undefined
        if (!Paul) {
          console.warn('Live2D: Paul_Pio constructor not found on window')
          return
        }

        // use actual model path from public/assets/live2d
        const modelPath = '/assets/live2d/models/pio/model.json'

        const pio = new Paul({
          mode: 'fixed',
          hidden: true,
          content: {
            welcome: ['欢迎！'],
          },
          model: [modelPath],
        })

        // debug: expose instance for console inspection
        ;(window as any).__PIO_INSTANCE = pio
        console.debug('Live2D: created pio instance ->', pio)

        pioRef.current = pio
        initedRef.current = true
        console.debug('Live2D: initialized', pio)
      } catch (err) {
        // Don't block app on failure
         
        console.error('Live2D init error:', err)
      }
    }

    // delay init slightly to avoid blocking first paint
    const t = window.setTimeout(init, 600)

    return () => {
      mounted = false
      clearTimeout(t)
      const p = pioRef.current
      try {
        if (p && typeof p.destroy === 'function') {
          p.destroy()
        }
      } catch {
        // ignore
      }
    }
  }, [])

  // render the expected container for Pio; it's harmless if Pio doesn't use it
  return (
    <div className="pio-container left" style={{ zIndex: 60 }}>
      <div className="pio-action" />
      <canvas id="pio" width={280} height={250} />
    </div>
  )
}
