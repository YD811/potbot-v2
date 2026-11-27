import WaitlistForm from '@/app/signup/WaitlistForm'

/** Shown instead of the BAG buy flow where BAG is not offered. Explains why and keeps the visitor. */
export function RegionBlocked() {
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="font-display text-2xl font-semibold text-white">BAG isn&apos;t offered in your region yet.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-pot-muted">
          Tokenized stocks are not available to US persons, and some countries are excluded for legal reasons.
          Leave your email and we&apos;ll tell you when a basket opens for you.
        </p>
      </div>
      <WaitlistForm source="bag-region" doneText="We'll write when a basket opens in your region. No spam." />
    </div>
  )
}
