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
        eyebrow="Waitlist"
        title="Get early access"
        lede="Creators who want a basket at launch and holders who want in first. One email, one line from us when mainnet opens."
      />
      <WaitlistForm />
    </div>
  )
}
