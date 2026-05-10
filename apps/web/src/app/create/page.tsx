'use client'

import nextDynamic from 'next/dynamic'

// The wizard pulls in Anchor + the Privy bridge, which crash Next.js
// static prerender (Maximum call stack size in @privy-io/react-auth's
// Solana subpath ESM evaluation). Loading the whole page client-only
// sidesteps SSR entirely. The page is wallet-required anyway, so SSG
// has zero value here.
const CreateWizard = nextDynamic(() => import('./CreateWizard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-pot-muted text-sm">Loading wizard…</div>
    </div>
  ),
})

export default function CreatePage() {
  return <CreateWizard />
}
