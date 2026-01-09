'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { WebParticles } from './Dark'
import { FloatingParticles } from './Light'

export const BackgroundLayer: React.FC = () => {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {theme === 'dark' ? <WebParticles /> : <FloatingParticles />}
    </div>
  )
}
