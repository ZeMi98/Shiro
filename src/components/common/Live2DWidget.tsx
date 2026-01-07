'use client'

import { useTheme } from 'next-themes'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { isHydrationEnded } from '~/components/common/HydrationEndDetector'
import { transitionViewIfSupported } from '~/lib/dom'
import type { Live2DConstructor, Live2DInstance } from '~/types/live2d'

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
  const { setTheme } = useTheme()
  const pioRef = useRef<Live2DInstance | null>(null)
  const initedRef = useRef(false)
  // keep canvas present in DOM to satisfy legacy scripts, but keep it hidden
  // until the Live2D instance is fully initialized to avoid visual flash
  const [canvasPresent] = useState(true)
  const [pioVisible, setPioVisible] = useState(false)

  useEffect(() => {
    if (initedRef.current) return

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
          window.Paul_Pio || window.PaulPio || window.Pio,
        )
        window.__PAUL_PIO = window.Paul_Pio || window.PaulPio || window.Pio

        if (!mounted) return

        const Paul: Live2DConstructor | undefined =
          window.Paul_Pio || window.PaulPio || window.Pio
        if (!Paul) {
          console.warn('Live2D: Paul_Pio constructor not found on window')
          return
        }

        // use actual model path from public/assets/live2d
        const modelPaths = [
          '/assets/live2d/models/neptune/model.json',
          '/assets/live2d/models/pio/model.json',
          // 可以添加更多模型路径
          // '/assets/live2d/models/model2/model.json',
          // '/assets/live2d/models/model3/model.json',
        ]

        // wait until page hydration/initial animations settled (HydrationEndDetector)
        // to avoid competing with continuous page animations
        const waitForHydrationEnd = async (timeout = 10000) => {
          const start = Date.now()
          while (!isHydrationEnded()) {
            if (Date.now() - start > timeout) break
            // poll at reasonable interval

            await new Promise((r) => setTimeout(r, 200))
          }
        }

        await waitForHydrationEnd()

        // ensure one frame for potential DOM updates (canvas already present)
        await new Promise((res) => requestAnimationFrame(res))

        // capture baseline blank image of canvas (if present) to detect first frame
        const canvasEl = document.getElementById(
          'pio',
        ) as HTMLCanvasElement | null
        let blankData: string | null = null
        try {
          if (canvasEl) blankData = canvasEl.toDataURL()
        } catch {}

        const pio = new Paul({
          mode: 'fixed',
          hidden: true,
          content: {
            welcome: ['欢迎！'],
            close: 'QWQ 下次再见吧~',
            skin: ['想看看我的新衣服吗？', '新衣服真漂亮~'],
            link: `${window.location.origin}/about`,
          },
          tips: true,
          model: modelPaths,
          night: () => {
            const currentTheme = document.documentElement.dataset.theme
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'

            // 移除 flushSync，直接调用
            transitionViewIfSupported(() => {
              setTheme(nextTheme)
            })
          },
        })

        // debug: expose instance for console inspection
        window.__PIO_INSTANCE = pio
        console.debug('Live2D: created pio instance ->', pio)

        pioRef.current = pio
        initedRef.current = true
        // show canvas once pio finished initialization AND the canvas has meaningful pixels
        try {
          const canvasEl2 = document.getElementById(
            'pio',
          ) as HTMLCanvasElement | null
          if (canvasEl2 && blankData) {
            const startPoll = Date.now()
            const timeout = 10000
            const poll = async () => {
              try {
                const data = canvasEl2.toDataURL()
                if (data !== blankData || Date.now() - startPoll > timeout) {
                  setPioVisible(true)
                } else {
                  setTimeout(poll, 200)
                }
              } catch {
                // on any error, stop polling and show to avoid hiding forever
                setPioVisible(true)
              }
            }
            poll()
          } else {
            setPioVisible(true)
          }
        } catch {
          setPioVisible(true)
        }
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

  // render the expected container for Pio; hide whole container until ready
  return (
    <div
      className="pio-container left"
      style={{ zIndex: 60, display: pioVisible ? undefined : 'none' }}
    >
      <div className="pio-action" />
      {canvasPresent && (
        <canvas
          id="pio"
          width={280}
          height={250}
          style={{ display: pioVisible ? undefined : 'none' }}
        />
      )}
    </div>
  )
}
