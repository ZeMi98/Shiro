'use client'
import { useEffect, useRef } from 'react'

import FloatingParticlesRenderer from '../particels/FloatingParticlesRenderer'

export const FloatingParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<FloatingParticlesRenderer | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const isMobile = window.innerWidth < 600
      const count = isMobile ? 40 : 120

      rendererRef.current = new FloatingParticlesRenderer(canvas, count)
      rendererRef.current.start()
    } catch (error) {
      console.error('Failed to initialize FloatingParticles:', error)
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy()
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
