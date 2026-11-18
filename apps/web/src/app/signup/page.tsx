import type { Metadata } from 'next'
import { PageHeader } from '@/components/PageHeader'
import WaitlistForm from './WaitlistForm'

export const metadata: Metadata = {
  title: 'Get early access',
  description: 'Leave an email and we write when PotBot mainnet opens. No spam.',
}

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="POTFolio waitlist"
        title="Get early access"
        lede="BAG is live now. POTFolios, baskets minted as one token, are next. Leave an email and get one line from us when they open on mainnet."
      />
      <WaitlistForm />
    </div>
  )
}
