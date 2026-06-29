/**
 * resolve-mints.ts — verify seed mints against the Jupiter token list.
 *
 * For every seed asset:
 *   - if it has a candidate mint  → verify(mint, symbol). On success, print the
 *     canonical decimals/symbol and mark VERIFIED (mint kept).
 *     On mismatch/404 → keep PENDING (mint cleared) and report the reason.
 *   - if it has no mint           → report PENDING (needs manual sourcing).
 *
 * This script ONLY produces a report (and, with --write, a resolved JSON file).
 * It NEVER flips `enabled` — enabling an asset stays a deliberate human action
 * in the DB after reviewing this report.
 *
 * Usage:
 *   npm run resolve-mints           # report only
 *   npm run resolve-mints -- --write resolved-assets.json
 */
import { ASSET_SEED } from '../src/seed/assets.seed.js';
import { JupiterTokensAdapter } from '../src/adapters/jupiterTokens.js';
import { hydrateSeed } from '../src/constants.js';
import { writeFileSync } from 'node:fs';

async function main() {
  const writeFlagIdx = process.argv.indexOf('--write');
  const writePath = writeFlagIdx >= 0 ? process.argv[writeFlagIdx + 1] : null;

  const jup = new JupiterTokensAdapter();
  const resolved: any[] = [];
  let verified = 0, mismatched = 0, pending = 0;

  for (const seed of ASSET_SEED) {
    const asset = hydrateSeed(seed, cryptoRandomId());
    if (!seed.mint) {
      pending++;
      console.log(`PENDING   ${pad(seed.symbol)} (${seed.category}) — no candidate mint`);
      resolved.push(asset);
      continue;
    }
    try {
      const { ok, token, reason } = await jup.verify(seed.mint, seed.symbol);
      if (ok && token) {
        verified++;
        asset.verified = true;
        asset.decimals = token.decimals;     // authoritative decimals
        asset.logoUrl = token.logoUrl ?? null;
        console.log(`VERIFIED  ${pad(seed.symbol)} decimals=${token.decimals} ${seed.mint}`);
      } else {
        mismatched++;
        asset.mint = null;                    // do NOT trust a mismatched mint
        console.log(`MISMATCH  ${pad(seed.symbol)} — ${reason}`);
      }
    } catch (e: any) {
      mismatched++;
      asset.mint = null;
      console.log(`ERROR     ${pad(seed.symbol)} — ${e?.message ?? e}`);
    }
    resolved.push(asset);
    await sleep(120); // be gentle with the public endpoint
  }

  console.log(`\nSummary: ${verified} verified, ${mismatched} mismatch/error, ${pending} pending (no mint).`);
  console.log('NOTE: nothing was enabled. Review, then set enabled=true per asset in the DB.');

  if (writePath) {
    writeFileSync(writePath, JSON.stringify(resolved, null, 2));
    console.log(`Wrote ${resolved.length} assets -> ${writePath}`);
  }
}

function pad(s: string) { return s.padEnd(10, ' '); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function cryptoRandomId() {
  // deterministic-enough id for the report; DB assigns real uuid via default.
  return 'seed_' + Math.random().toString(36).slice(2, 10);
}

main().catch((e) => { console.error(e); process.exit(1); });
