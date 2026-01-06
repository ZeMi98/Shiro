'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

type Vec = { x: number; y: number }

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

export function BackgroundLayer(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [particleCount, setParticleCount] = useState<number>(100)

  // (removed saved widget position logic — no live2d widget container)

  useEffect(() => {
    const touch = isTouchDevice()
    if (touch || (typeof window !== 'undefined' && window.innerWidth < 600)) {
      setParticleCount(40)
    } else {
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
          // reduce connection distance to make lines sparser
          if (d2 < 100 * 100) {
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [particleCount])

  // (removed live2d-widget lazy-load effect)

  // (removed floating widget drag/position logic — no live2d container)

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
