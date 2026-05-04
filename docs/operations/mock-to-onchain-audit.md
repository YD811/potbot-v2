# Mock → On-Chain Audit (`apps/web`)

## Requested grep results

### `usePotStore | useProposalStore | useMemberStore`
No matches in `apps/web/src`.

### `NEXT_PUBLIC_MOCK_MODE`
- `apps/web/src/components/SwapExecuteButton.tsx:41`

### `mockSwap | mockDeposit | mockCreate`
No matches in `apps/web/src`.

## Zustand mock-state usage to replace with Anchor / on-chain sources

> Primary mock store used in this repo is `useMockStore` (from `apps/web/src/lib/mock-store.ts`), not `usePotStore/useProposalStore/useMemberStore`.

### UI components/pages currently reading mock state directly
- `apps/web/src/components/DCAPanel.tsx:5`
- `apps/web/src/components/DCAPanel.tsx:51`
- `apps/web/src/components/LimitOrderPanel.tsx:5`
- `apps/web/src/components/LimitOrderPanel.tsx:65`
- `apps/web/src/components/SharesTab.tsx:4`
- `apps/web/src/components/SharesTab.tsx:32`
- `apps/web/src/components/ReferralPanel.tsx:5`
- `apps/web/src/components/ReferralPanel.tsx:21`
- `apps/web/src/components/ReferralPanel.tsx:22`
- `apps/web/src/app/page.tsx:8`
- `apps/web/src/app/page.tsx:56`
- `apps/web/src/app/admin/page.tsx:7`
- `apps/web/src/app/admin/page.tsx:81`
- `apps/web/src/app/admin/page.tsx:82`
- `apps/web/src/app/my-pots/page.tsx:8`
- `apps/web/src/app/my-pots/page.tsx:33`

### Hook-level mock fallback (critical migration points)
- `apps/web/src/hooks/usePots.ts:17`
- `apps/web/src/hooks/usePots.ts:64`
- `apps/web/src/hooks/usePots.ts:110`
- `apps/web/src/hooks/usePots.ts:115`
- `apps/web/src/hooks/usePots.ts:139`
- `apps/web/src/hooks/usePots.ts:192`
- `apps/web/src/hooks/usePots.ts:220`
- `apps/web/src/hooks/usePots.ts:255`
- `apps/web/src/hooks/usePots.ts:271`
- `apps/web/src/hooks/usePots.ts:310`
- `apps/web/src/hooks/usePots.ts:385`
- `apps/web/src/hooks/usePots.ts:390`
- `apps/web/src/hooks/usePots.ts:394`
- `apps/web/src/hooks/usePots.ts:430`
- `apps/web/src/hooks/usePots.ts:434`
- `apps/web/src/hooks/usePots.ts:435`
- `apps/web/src/hooks/usePots.ts:472`
- `apps/web/src/hooks/usePots.ts:476`
- `apps/web/src/hooks/usePots.ts:477`
- `apps/web/src/hooks/usePots.ts:532`
- `apps/web/src/hooks/usePots.ts:537`
- `apps/web/src/hooks/usePots.ts:550`
- `apps/web/src/hooks/usePots.ts:592`
- `apps/web/src/hooks/usePots.ts:596`
- `apps/web/src/hooks/usePots.ts:597`
- `apps/web/src/hooks/usePots.ts:636`
- `apps/web/src/hooks/usePots.ts:640`
- `apps/web/src/hooks/usePots.ts:641`

## Notes
- This codebase does not currently use `usePotStore`, `useProposalStore`, or `useMemberStore`; migration scope is centered on `useMockStore` + fallback branches in `usePots.ts`.
- `SwapExecuteButton` now has an explicit `NEXT_PUBLIC_MOCK_MODE` gate (mock path vs on-chain `execute_swap` path).
