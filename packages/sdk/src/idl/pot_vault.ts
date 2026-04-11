/**
 * Hand-crafted IDL matching the pot_vault Anchor program.
 * Replace with auto-generated IDL after `anchor build`.
 */
export const IDL = {
  version: '0.1.0',
  name: 'pot_vault',
  instructions: [
    {
      name: 'createPot',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        {
          name: 'params',
          type: { defined: 'CreatePotParams' },
        },
      ],
    },
    {
      name: 'deposit',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        { name: 'member', isMut: true, isSigner: false },
        { name: 'depositor', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'lamports', type: 'u64' }],
    },
    {
      name: 'withdraw',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        { name: 'member', isMut: true, isSigner: false },
        { name: 'withdrawer', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'shares', type: 'u64' }],
    },
    {
      name: 'createProposal',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'proposal', isMut: true, isSigner: false },
        { name: 'member', isMut: false, isSigner: false },
        { name: 'proposer', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        {
          name: 'params',
          type: { defined: 'CreateProposalParams' },
        },
      ],
    },
    {
      name: 'vote',
      accounts: [
        { name: 'pot', isMut: false, isSigner: false },
        { name: 'proposal', isMut: true, isSigner: false },
        { name: 'member', isMut: false, isSigner: false },
        { name: 'voter', isMut: false, isSigner: true },
      ],
      args: [{ name: 'approve', type: 'bool' }],
    },
    {
      name: 'executeProposal',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        { name: 'proposal', isMut: true, isSigner: false },
        { name: 'executor', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'PotAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority', type: 'publicKey' },
          { name: 'name', type: 'string' },
          { name: 'emoji', type: 'string' },
          { name: 'vaultBump', type: 'u8' },
          { name: 'potBump', type: 'u8' },
          { name: 'totalShares', type: 'u64' },
          { name: 'memberCount', type: 'u32' },
          { name: 'tradeCount', type: 'u32' },
          { name: 'totalVolume', type: 'u64' },
          { name: 'tamagotchiLevel', type: 'u8' },
          { name: 'tamagotchiXp', type: 'u64' },
          { name: 'communityTokenMint', type: 'publicKey' },
          { name: 'config', type: { defined: 'PotConfig' } },
          { name: 'governance', type: { defined: 'GovSettings' } },
          { name: 'nextProposalId', type: 'u64' },
          { name: 'createdAt', type: 'i64' },
        ],
      },
    },
    {
      name: 'MemberAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot', type: 'publicKey' },
          { name: 'wallet', type: 'publicKey' },
          { name: 'shares', type: 'u64' },
          { name: 'depositTotal', type: 'u64' },
          { name: 'withdrawTotal', type: 'u64' },
          { name: 'joinedAt', type: 'i64' },
          { name: 'lastDepositAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'ProposalAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot', type: 'publicKey' },
          { name: 'proposalId', type: 'u64' },
          { name: 'proposer', type: 'publicKey' },
          { name: 'proposalType', type: { defined: 'ProposalType' } },
          { name: 'description', type: 'string' },
          { name: 'status', type: { defined: 'ProposalStatus' } },
          { name: 'yesShares', type: 'u64' },
          { name: 'noShares', type: 'u64' },
          { name: 'totalSharesSnapshot', type: 'u64' },
          { name: 'createdAt', type: 'i64' },
          { name: 'resolvedAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
  types: [
    {
      name: 'CreatePotParams',
      type: {
        kind: 'struct',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'emoji', type: 'string' },
          { name: 'isPublic', type: 'bool' },
          { name: 'minDeposit', type: 'u64' },
          { name: 'lockupSeconds', type: 'i64' },
          { name: 'yieldStrategy', type: 'u8' },
          { name: 'maxYieldAllocationBps', type: 'u16' },
          { name: 'tradeLevel', type: 'u8' },
          { name: 'withdrawLevel', type: 'u8' },
          { name: 'memberChangeLevel', type: 'u8' },
          { name: 'settingsChangeLevel', type: 'u8' },
          { name: 'yieldChangeLevel', type: 'u8' },
          { name: 'voteTimeoutSeconds', type: 'i64' },
          { name: 'quorumBps', type: 'u16' },
        ],
      },
    },
    {
      name: 'CreateProposalParams',
      type: {
        kind: 'struct',
        fields: [
          { name: 'proposalType', type: { defined: 'ProposalType' } },
          { name: 'description', type: 'string' },
        ],
      },
    },
    {
      name: 'PotConfig',
      type: {
        kind: 'struct',
        fields: [
          { name: 'isPublic', type: 'bool' },
          { name: 'minDeposit', type: 'u64' },
          { name: 'lockupSeconds', type: 'i64' },
          { name: 'yieldStrategy', type: { defined: 'YieldStrategy' } },
          { name: 'maxYieldAllocationBps', type: 'u16' },
        ],
      },
    },
    {
      name: 'GovSettings',
      type: {
        kind: 'struct',
        fields: [
          { name: 'tradeLevel', type: 'u8' },
          { name: 'withdrawLevel', type: 'u8' },
          { name: 'memberChangeLevel', type: 'u8' },
          { name: 'settingsChangeLevel', type: 'u8' },
          { name: 'yieldChangeLevel', type: 'u8' },
          { name: 'voteTimeoutSeconds', type: 'i64' },
          { name: 'quorumBps', type: 'u16' },
        ],
      },
    },
    {
      name: 'YieldStrategy',
      type: {
        kind: 'enum',
        variants: [
          { name: 'None' },
          { name: 'Conservative' },
          { name: 'Balanced' },
          { name: 'Aggressive' },
        ],
      },
    },
    {
      name: 'ProposalType',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Swap',
            fields: [
              { name: 'fromMint', type: 'publicKey' },
              { name: 'toMint', type: 'publicKey' },
              { name: 'amountIn', type: 'u64' },
              { name: 'minAmountOut', type: 'u64' },
            ],
          },
          {
            name: 'Withdraw',
            fields: [
              { name: 'beneficiary', type: 'publicKey' },
              { name: 'amount', type: 'u64' },
            ],
          },
          {
            name: 'ChangeSettings',
            fields: [
              { name: 'newTradeLevel', type: 'u8' },
              { name: 'newWithdrawLevel', type: 'u8' },
            ],
          },
          {
            name: 'ChangeYield',
            fields: [{ name: 'newStrategy', type: 'u8' }],
          },
        ],
      },
    },
    {
      name: 'ProposalStatus',
      type: {
        kind: 'enum',
        variants: [
          { name: 'Active' },
          { name: 'Passed' },
          { name: 'Rejected' },
          { name: 'Executed' },
          { name: 'Expired' },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: 'InvalidName', msg: 'POT name must be 1-32 characters' },
    { code: 6001, name: 'DepositTooSmall', msg: 'Deposit below minimum' },
    { code: 6002, name: 'InsufficientShares', msg: 'Not enough shares to withdraw' },
    { code: 6003, name: 'LockupActive', msg: 'Lockup period has not elapsed' },
    { code: 6004, name: 'Unauthorized', msg: 'Unauthorized action' },
    { code: 6005, name: 'NotPublic', msg: 'POT is not public' },
    { code: 6006, name: 'ProposalNotActive', msg: 'Proposal is not active' },
    { code: 6007, name: 'AlreadyVoted', msg: 'Already voted on this proposal' },
    { code: 6008, name: 'ProposalNotPassed', msg: 'Proposal has not passed' },
    { code: 6009, name: 'ProposalAlreadyExecuted', msg: 'Proposal already executed' },
    { code: 6010, name: 'GovernanceBlocked', msg: 'Governance level blocks this action' },
    { code: 6011, name: 'MathOverflow', msg: 'Math overflow' },
    { code: 6012, name: 'InsufficientVaultBalance', msg: 'Insufficient vault balance' },
    { code: 6013, name: 'MemberNotFound', msg: 'Member account not found' },
    { code: 6014, name: 'InvalidYieldStrategy', msg: 'Invalid yield strategy' },
    { code: 6015, name: 'QuorumNotReached', msg: 'Quorum not reached' },
  ],
} as const

export default IDL

export type PotVault = typeof IDL
