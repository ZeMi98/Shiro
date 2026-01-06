'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

type Vec = { x: number; y: number }

const STORAGE_KEY = 'live2d-position'
const DEFAULT_POS = { x: 24, y: 24 }

function isTouchDevice() {
  try {
    return (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    )
  } catch {
    return false
  }
}

export function BackgroundLayer(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [enabledLive2d, setEnabledLive2d] = useState<boolean>(true)
  const [initedLive2d, setInitedLive2d] = useState<boolean>(false)
  const [particleCount, setParticleCount] = useState<number>(100)
  const draggingRef = useRef(false)
  const dragOffsetRef = useRef<Vec>({ x: 0, y: 0 })
  const longPressTimerRef = useRef<number | null>(null)
  const hasInteractedRef = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && containerRef.current) {
        const p = JSON.parse(saved)
        containerRef.current.style.left = `${p.x}px`
        containerRef.current.style.top = `${p.y}px`
      } else if (containerRef.current) {
        containerRef.current.style.left = `${DEFAULT_POS.x}px`
        containerRef.current.style.top = `${DEFAULT_POS.y}px`
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const touch = isTouchDevice()
    if (touch || (typeof window !== 'undefined' && window.innerWidth < 600)) {
      setEnabledLive2d(false)
      setParticleCount(40)
    } else {
      setEnabledLive2d(true)
      setParticleCount(120)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1

    function resize() {
      dpr = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      r: number
    }[] = []

    function initParticles() {
      particles.length = 0
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 0.5 + Math.random() * 1.5,
        })
      }
    }

    function step() {
      ctx.clearRect(0, 0, width, height)
      // theme-aware colors (read from CSS variables so multi-theme works)
      let particleColor = 'rgba(255,255,255,0.9)'
      let lineColor = 'rgba(255,255,255,0.06)'
      try {
        const css = getComputedStyle(document.documentElement)
        const pc = css.getPropertyValue('--particle-color')
        const lc = css.getPropertyValue('--particle-line-color')
        if (pc) particleColor = pc.trim()
        if (lc) lineColor = lc.trim()
      } catch {
        // ignore in non-browser environments
      }

      ctx.fillStyle = particleColor
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = lineColor
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 140 * 140) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }

    resize()
    initParticles()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(step)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [particleCount])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let io: IntersectionObserver | null = null
    let loaded = false

    const tryLoadLive2d = async () => {
      if (!enabledLive2d || initedLive2d || loaded) return
      loaded = true
      try {
        const mod = await import('live2d-widget')
        const initFunc =
          (mod as any).init ||
          (mod as any).default?.init ||
          (mod as any).default
        if (!initFunc) {
          console.warn('live2d-widget: init API not found; skipping')
          return
        }
        const modelPath = '/assets/live2d/model.json'
        try {
          ;(initFunc as any)({
            model: { jsonPath: modelPath },
            display: { position: 'right', width: 120, height: 240 },
            log: false,
          })
          setInitedLive2d(true)
        } catch (err) {
          console.warn('live2d-widget: initialization failed (silently)', err)
        }
      } catch (err) {
        console.log('live2d-widget not available or failed to import', err)
      }
    }

    try {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            tryLoadLive2d()
            if (io) {
              io.disconnect()
              io = null
            }
            break
          }
        }
      })
      io.observe(container)
    } catch {
      tryLoadLive2d()
    }

    const onFirstInteraction = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true
        tryLoadLive2d()
      }
    }
    window.addEventListener('pointerdown', onFirstInteraction, { once: true })

    return () => {
      if (io) io.disconnect()
      window.removeEventListener('pointerdown', onFirstInteraction)
    }
  }, [enabledLive2d, initedLive2d])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container) return

    function savePos(x: number, y: number) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }))
      } catch {}
    }

    function resetPos() {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      container.style.left = `${DEFAULT_POS.x}px`
      container.style.top = `${DEFAULT_POS.y}px`
    }

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button === 2) {
        ev.preventDefault()
        resetPos()
        return
      }

      const rect = container.getBoundingClientRect()
      draggingRef.current = true
      dragOffsetRef.current = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
      }
      ;(ev.target as Element).setPointerCapture(ev.pointerId)

      if (canvas) canvas.style.pointerEvents = 'none'

      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
      longPressTimerRef.current = window.setTimeout(() => {
        resetPos()
      }, 2000)
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      ev.preventDefault()
      const x = ev.clientX - dragOffsetRef.current.x
      const y = ev.clientY - dragOffsetRef.current.y
      const maxX = window.innerWidth - container.offsetWidth
      const maxY = window.innerHeight - container.offsetHeight
      const nx = Math.max(0, Math.min(maxX, x))
      const ny = Math.max(0, Math.min(maxY, y))
      container.style.left = `${nx}px`
      container.style.top = `${ny}px`
    }

    const onPointerUp = (ev: PointerEvent) => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      if (draggingRef.current) {
        draggingRef.current = false
        try {
          ;(ev.target as Element).releasePointerCapture?.(ev.pointerId)
        } catch {}
        if (canvas) canvas.style.pointerEvents = ''
        const left = Number.parseInt(container.style.left || '0', 10)
        const top = Number.parseInt(container.style.top || '0', 10)
        savePos(left, top)
      }
    }

    const onContext = (ev: MouseEvent) => {
      ev.preventDefault()
      resetPos()
    }

    container.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    container.addEventListener('contextmenu', onContext)

    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('contextmenu', onContext)
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }, [])

  return (
    <>
      <div
        className="background-layer"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'auto',
          }}
        />
      </div>
    </>
  )
}

export default BackgroundLayer
