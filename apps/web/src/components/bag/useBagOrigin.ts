'use client'

import { useEffect, useState } from 'react'

export const BAG_PROD_ORIGIN = 'https://potbot.fun'

/**
 * Origin for share and invite links: potbot.fun in production, the current
 * origin on preview and staging builds (where potbot.fun has no BAG yet).
 */
export function useBagOrigin(): string {
  const [origin, setOrigin] = useState(BAG_PROD_ORIGIN)
  useEffect(() => {
    const h = window.location.hostname
    if (h !== 'potbot.fun' && h !== 'www.potbot.fun') setOrigin(window.location.origin)
  }, [])
  return origin
}
