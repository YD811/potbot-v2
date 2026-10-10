import Link from 'next/link'

/** Shown on every Vault (PotBot v2) page: the vault UI is reference-only while POTfolio is the live product. */
export function VaultsPreviewBanner() {
  return (
    <div className="mx-auto mb-6 max-w-[1400px] px-3 sm:px-6">
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-pot-accent/40 bg-pot-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-pot-accent">Vaults · in development</div>
          <p className="mt-1 text-sm text-white/85">
            This is the PotBot v2 vault interface, kept here for reference while it is being reworked. The live product is
            POTfolio: one token, a whole basket inside.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/portfolios" className="btn-primary px-5 py-3 text-base">Go to POTfolios</Link>
          <Link href="/portfolios/new" className="btn-secondary px-5 py-3 text-base">Create one</Link>
        </div>
      </div>
    </div>
  )
}
