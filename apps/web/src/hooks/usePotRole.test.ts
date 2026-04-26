// TODO: No vitest/jest dependency is currently configured in apps/web/package.json.
// Add a test runner, then convert these documented cases into executable tests.
//
// Required cases:
// 1) creator -> wallet matches pot.creator/pot.authority => role === 'creator'
// 2) member  -> wallet appears in members[] but is not creator => role === 'member'
// 3) viewer  -> wallet is connected but not creator/member OR wallet missing => role === 'viewer'
//
// Suggested test skeleton (vitest):
// import { describe, expect, it } from 'vitest'
// import { derivePotRole } from './usePotRole'
//
// describe('derivePotRole', () => {
//   it('returns creator for creator wallet', () => { ... })
//   it('returns member for member wallet', () => { ... })
//   it('returns viewer for non-member wallet', () => { ... })
// })

export {}
