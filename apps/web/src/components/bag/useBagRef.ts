'use client'

import { useEffect, useState } from 'react'

const REF_KEY = 'potbot.bag.ref'
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/**
 * Invite attribution. A `?ref=<wallet>` on any BAG page is remembered in
 * this browser (first one wins) and sent along with a join or a buy.
 */
export function useBagRef(): string | null {
  const [ref, setRef] = useState<string | null>(null)
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref')
      if (fromUrl && WALLET_RE.test(fromUrl) && !window.localStorage.getItem(REF_KEY)) {
        window.localStorage.setItem(REF_KEY, fromUrl)
      }
      setRef(window.localStorage.getItem(REF_KEY))
    } catch {
      /* private mode: no attribution */
    }
  }, [])
  return ref
}
