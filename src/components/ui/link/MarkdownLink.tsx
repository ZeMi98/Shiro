'use client'

import { useRouter } from 'next/navigation'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo } from 'react'

import { isServerSide } from '~/lib/env'
import { springScrollToElement } from '~/lib/scroller'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

import { MagneticHoverEffect } from '../effect/MagneticHoverEffect'
import { FloatPopover } from '../float-popover'
import { Favicon } from '../rich-link/Favicon'

export const MarkdownLink: FC<{
  href: string
  title?: string
  children?: ReactNode
  text?: string
  popper?: boolean
}> = memo(({ href, children, title, popper = true }) => {
  const router = useRouter()
  const isSelfUrl = useMemo(() => {
    if (isServerSide) return false
    const locateUrl = new URL(location.href)

    let toUrlParser
    try {
      toUrlParser = new URL(href)
    } catch {
      try {
        toUrlParser = new URL(href, location.origin)
      } catch {
        return false
      }
    }
    return (
      toUrlParser.host === locateUrl.host ||
      (process.env.NODE_ENV === 'development' &&
        toUrlParser.host === 'innei.in')
    )
  }, [href])

  const handleRedirect = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      // Handle anchor links (starting with #)
      if (href.startsWith('#')) {
        e.preventDefault()
        const targetId = href.slice(1)
        
        // Try to find the element with the exact ID first
        let targetElement = document.getElementById(targetId)
        
        // If not found, try to find elements with the pattern "number__targetId"
        if (!targetElement) {
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
          for (const heading of headings) {
            if (heading.id.endsWith(`__${targetId}`)) {
              targetElement = heading as HTMLElement
              break
            }
          }
        }
        
        if (targetElement) {
          // Update URL hash
          const { state } = history
          history.replaceState(state, '', `#${targetElement.id}`)
          
          // Scroll to the element
          springScrollToElement(targetElement, -100)
        }
        return
      }

      const toUrlParser = new URL(href)
      if (!isSelfUrl) {
        return
      }
      e.preventDefault()
      const pathArr = toUrlParser.pathname.split('/').find(Boolean)
      const headPath = pathArr

      switch (headPath) {
        case 'posts':
        case 'notes':
        case 'category': {
          router.push(toUrlParser.pathname)
          break
        }
        default: {
          window.open(toUrlParser.pathname)
        }
      }
    },
    [href, isSelfUrl, router],
  )

  const el = (
    <span className="inline items-center font-sans">
      {isSelfUrl ? <BizSelfFavicon /> : <Favicon href={href} />}
      <MagneticHoverEffect
        as="a"
        variant="accent"
        href={href}
        className="indent-0 decoration-accent/60 hover:decoration-transparent"
        target="_blank"
        onClick={handleRedirect}
        title={title}
        rel="noreferrer"
      >
        {children}
        <i
          className="i-mingcute-arrow-right-up-line translate-y-[2px] opacity-70"
          data-hide-print
        />
      </MagneticHoverEffect>
    </span>
  )
  if (!popper) return el
  return (
    <FloatPopover
      as="span"
      wrapperClassName="!inline"
      type="tooltip"
      offset={0}
      triggerElement={el}
    >
      <MagneticHoverEffect
        variant="accent"
        as="a"
        className="indent-0 decoration-accent/60 hover:decoration-transparent"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        <span>{href}</span>
      </MagneticHoverEffect>
    </FloatPopover>
  )
})
MarkdownLink.displayName = 'MarkdownLink'

const BizSelfFavicon = () => {
  const { favicon, faviconDark } = useAppConfigSelector((a) => a.site) || {}
  if (!favicon && !faviconDark) return null
  return (
    <span className="center mr-1 inline-flex size-4">
      <img
        className="inline size-4 dark:hidden"
        src={favicon ? favicon : faviconDark ? faviconDark : ''}
      />
      <img
        className="hidden size-4 dark:inline"
        src={faviconDark ? faviconDark : favicon ? favicon : ''}
      />
    </span>
  )
}
