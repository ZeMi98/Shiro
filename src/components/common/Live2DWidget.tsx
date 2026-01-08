'use client'

import { useTheme } from 'next-themes'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { isHydrationEnded } from '~/components/common/HydrationEndDetector'
import { transitionViewIfSupported } from '~/lib/dom'
import type { Live2DConstructor, Live2DInstance } from '~/types/live2d'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
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
  const [canvasPresent] = useState(true)
  const [pioVisible, setPioVisible] = useState(false)
  const [showAvatar, setShowAvatar] = useState(false)

  useEffect(() => {
    if (initedRef.current) return

    let mounted = true

    async function init() {
      try {
        loadCSS('/assets/live2d/static/pio.css')
        await loadScript('/assets/live2d/static/l2d.js')
        await loadScript('/assets/live2d/static/pio.js')

        window.__PAUL_PIO = window.Paul_Pio || window.PaulPio || window.Pio

        if (!mounted) return

        const Paul: Live2DConstructor | undefined =
          window.Paul_Pio || window.PaulPio || window.Pio
        if (!Paul) {
          console.warn('Live2D: Paul_Pio constructor not found on window')
          return
        }

        const modelPaths = [
          '/assets/live2d/models/neptune/model.json',
          '/assets/live2d/models/pio/model.json',
          '/assets/live2d/models/kesyoban/model.json',
        ]

        const waitForHydrationEnd = async (timeout = 10000) => {
          const start = Date.now()
          while (!isHydrationEnded()) {
            if (Date.now() - start > timeout) break
            await new Promise((r) => setTimeout(r, 200))
          }
        }

        await waitForHydrationEnd()
        await new Promise((res) => requestAnimationFrame(res))

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
            transitionViewIfSupported(() => {
              setTheme(nextTheme)
            })
          },
        })

        window.__PIO_INSTANCE = pio
        console.debug('Live2D: created pio instance ->', pio)

        pioRef.current = pio
        initedRef.current = true

        // Check if should show avatar based on localStorage
        const posterGirlStatus = localStorage.getItem('posterGirl')
        if (posterGirlStatus === '0') {
          setShowAvatar(true)
          setPioVisible(false)
        } else {
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
        }

        console.debug('Live2D: initialized', pio)
      } catch (err) {
        console.error('Live2D init error:', err)
      }
    }

    const t = window.setTimeout(init, 600)

    return () => {
      mounted = false
      clearTimeout(t)
      const p = pioRef.current
      try {
        if (p && typeof p.destroy === 'function') {
          p.destroy()
        }
      } catch {}
    }
  }, [])

  // Handle avatar click to reopen Live2D
  const handleAvatarClick = () => {
    setShowAvatar(false)
    setPioVisible(true)
    localStorage.setItem('posterGirl', '1')

    const pio = pioRef.current
    if (pio && typeof pio.init === 'function') {
      try {
        pio.init() // pass true to skip loading model again
        const body = document.querySelector('.pio-container')
        if (body) {
          body.classList.remove('hidden')
        }
      } catch (err) {
        console.error('Failed to reinit pio:', err)
      }
    }
  }

  // Listen for destroy event from pio.js
  useEffect(() => {
    const checkHiddenStatus = setInterval(() => {
      const body = document.querySelector('.pio-container')
      if (body && body.classList.contains('hidden')) {
        setShowAvatar(true)
        setPioVisible(false)
      }
    }, 500)

    return () => clearInterval(checkHiddenStatus)
  }, [])

  return (
    <div
      className="pio-container left"
      style={{ zIndex: 60, display: 'block' }}
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
      {showAvatar && (
        <div
          className="pio-show"
          onClick={handleAvatarClick}
          style={{
            backgroundImage: 'url(/assets/live2d/static/avatar.jpg)',
            cursor: 'pointer',
            opacity: showAvatar ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out, transform 0.3s ease',
          }}
        />
      )}
    </div>
  )
}
