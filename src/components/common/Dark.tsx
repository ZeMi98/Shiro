'use client'
import { useEffect, useRef } from 'react'

export const WebParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isMobile = window.innerWidth < 600
    const particleCount = isMobile ? 40 : 120

    let width = 0
    let height = 0
    let dpr = 1

    function resize(): void {
      if (!canvas || !ctx) return

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

    const mouse = {
      x: 0,
      y: 0,
      aliveUntil: 0,
    }

    function initParticles(): void {
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

    function step(): void {
      if (!ctx) return

      ctx.clearRect(0, 0, width, height)

      const particleColor = 'rgba(255,255,255,0.9)'
      const lineColor = 'rgba(255,255,255,0.06)'

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
          if (d2 < 100 * 100) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      try {
        const now = performance.now()
        const remaining = Math.max(0, mouse.aliveUntil - now)
        if (remaining > 0) {
          const t = remaining / 1000
          ctx.save()
          ctx.globalAlpha = Math.min(0.9, 0.3 + 0.7 * t)
          for (const p of particles) {
            const dx = p.x - mouse.x
            const dy = p.y - mouse.y
            const d2 = dx * dx + dy * dy
            if (d2 < 120 * 120) {
              ctx.beginPath()
              ctx.moveTo(p.x, p.y)
              ctx.lineTo(mouse.x, mouse.y)
              ctx.stroke()
            }
          }
          ctx.beginPath()
          ctx.fillStyle = particleColor
          ctx.globalAlpha = Math.min(0.9, 0.6 * t)
          ctx.arc(mouse.x, mouse.y, 2 + 2 * t, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      } catch {
        // ignore
      }
      rafRef.current = requestAnimationFrame(step)
    }

    resize()
    initParticles()

    function onPointerMove(e: MouseEvent | TouchEvent) {
      try {
        let cx = 0
        let cy = 0
        if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
          const t = (e as TouchEvent).touches[0]
          cx = t.clientX
          cy = t.clientY
        } else if (
          (e as TouchEvent).changedTouches &&
          (e as TouchEvent).changedTouches.length > 0
        ) {
          const t = (e as TouchEvent).changedTouches[0]
          cx = t.clientX
          cy = t.clientY
        } else {
          const me = e as MouseEvent
          cx = me.clientX
          cy = me.clientY
        }
        mouse.x = cx
        mouse.y = cy
        mouse.aliveUntil = performance.now() + 1000
      } catch {
        // ignore
      }
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('touchmove', onPointerMove, { passive: true })
    rafRef.current = requestAnimationFrame(step)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('touchmove', onPointerMove)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
