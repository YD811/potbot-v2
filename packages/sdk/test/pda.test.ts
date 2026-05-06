import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { getPotAddress, PROGRAM_ID } from '../src/pda';

describe('PDA parity', () => {
  const authority = new PublicKey('11111111111111111111111111111112');
  const name = 'test-pot';

  it('getPotAddress uses canonical seed order [pot, authority, name]', () => {
    const [derived] = getPotAddress(name, authority);

    const [canonical] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pot'),
        authority.toBuffer(),
        Buffer.from(name),
      ],
      PROGRAM_ID
    );

    expect(derived.toBase58()).toBe(canonical.toBase58());
  });

  it('getPotAddress seed order matches e2e-smoke.ts reference', () => {
    const [fromSdk] = getPotAddress(name, authority);
    const [fromReference] = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
      PROGRAM_ID
    );
    expect(fromSdk.toBase58()).toBe(fromReference.toBase58());
  });
});
