import type { Metadata } from 'next'
import { BagDashboard } from '@/components/bag/BagDashboard'

export const metadata: Metadata = {
  title: 'Your BAG | PotBot',
  description: 'Your BAG, your invite link, the wallets you brought and your BAG Points.',
  robots: { index: false, follow: false },
}

export default function BagMePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <BagDashboard />
    </div>
  )
}
