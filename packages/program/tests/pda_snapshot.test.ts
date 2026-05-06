import { expect } from 'chai';
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK');

function derivePotPda(authority: PublicKey, name: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
    PROGRAM_ID
  )[0];
}

describe('PDA snapshot \u2014 regression prevention', () => {
  const authority = new PublicKey('11111111111111111111111111111112');
  const name = 'snapshot-test';

  it('canonical derivation is deterministic', () => {
    const pda1 = derivePotPda(authority, name);
    const pda2 = derivePotPda(authority, name);
    expect(pda1.toBase58()).to.equal(pda2.toBase58());
  });

  it('seed order [authority, name] differs from wrong order [name, authority]', () => {
    const canonical = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), authority.toBuffer(), Buffer.from(name)],
      PROGRAM_ID
    )[0];
    const wrong = PublicKey.findProgramAddressSync(
      [Buffer.from('pot'), Buffer.from(name), authority.toBuffer()],
      PROGRAM_ID
    )[0];
    expect(canonical.toBase58()).to.not.equal(wrong.toBase58());
  });

  it('SDK getPotAddress matches canonical derivation', async () => {
    const { getPotAddress } = await import('../../sdk/src/pda');
    const [sdkDerived] = getPotAddress(name, authority);
    const canonical = derivePotPda(authority, name);
    expect(sdkDerived.toBase58()).to.equal(canonical.toBase58());
  });
});
