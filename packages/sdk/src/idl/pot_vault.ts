/**
 * IDL matching the pot_vault Anchor program — Anchor 0.30 format.
 *
 * Changes from 0.28 → 0.30 format:
 *  - accounts[]: now { name (camelCase), discriminator } only — no inline type
 *  - types[]:    account struct defs added here (moved from accounts[])
 *  - instructions[]: discriminators added
 */
export const IDL = {
  // Anchor 0.30 requires `address` on the root IDL object — it's what
  // `new Program(idl, provider)` reads to resolve the program's public key.
  // Must match `declare_id!` in programs/pot_vault/src/lib.rs and the
  // value in root vercel.json (NEXT_PUBLIC_PROGRAM_ID).
  address: 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
  version: '0.1.0',
  name: 'pot_vault',
  metadata: {
    address: 'GJap9DjUoKZ9dhXMqGCPTeTzY6kPyBJ51SXL1pi8AmiK',
    name: 'pot_vault',
    version: '0.1.0',
    spec: '0.1.0',
  },
  instructions: [
    {
      name: 'createPot',
      discriminator: [232, 45, 123, 181, 204, 121, 131, 9],
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        // PotBot protocol treasury — receives POT_CREATION_FEE on every
        // create_pot call. Address-pinned at the program level to
        // TREASURY_ADDRESS, so any other key here will be rejected.
        { name: 'treasury', isMut: true, isSigner: false },
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
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182],
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
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34],
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
      discriminator: [132, 116, 68, 174, 216, 160, 198, 22],
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
      discriminator: [227, 110, 155, 23, 136, 126, 172, 25],
      accounts: [
        { name: 'pot', isMut: false, isSigner: false },
        { name: 'proposal', isMut: true, isSigner: false },
        { name: 'member', isMut: false, isSigner: false },
        { name: 'voterRecord', isMut: true, isSigner: false },
        { name: 'voter', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'approve', type: 'bool' }],
    },
    {
      name: 'executeProposal',
      discriminator: [186, 60, 116, 133, 108, 128, 111, 28],
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        { name: 'proposal', isMut: true, isSigner: false },
        { name: 'executor', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'updateTamagotchi',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'executeSwap',
      discriminator: [56, 182, 124, 215, 155, 140, 157, 102],
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'vault', isMut: true, isSigner: false },
        { name: 'authority', isMut: false, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        {
          name: 'params',
          type: { defined: 'ExecuteSwapParams' },
        },
      ],
    },
    {
      name: 'initTokenMint',
      accounts: [
        { name: 'pot', isMut: true, isSigner: false },
        { name: 'tokenMint', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  // ── Anchor 0.30 accounts format ──────────────────────────────────────────
  // Each entry is { name (camelCase), discriminator: sha256("account:<PascalCase>")[:8] }
  // Struct field definitions live in types[] below.
  accounts: [
    // Core program accounts
    { name: 'potAccount',      discriminator: [202, 25,  205, 47,  59,  253, 100, 118] },
    { name: 'memberAccount',   discriminator: [173, 25,  100, 97,  192, 177, 84,  139] },
    { name: 'proposalAccount', discriminator: [164, 190, 4,   248, 203, 124, 243, 64]  },
    { name: 'voterRecord',     discriminator: [178, 96,  138, 116, 143, 202, 115, 33]  },
    // Premium feature accounts
    { name: 'privatePotAccount',    discriminator: [229, 0,   144, 66,  200, 25,  159, 46]  },
    { name: 'snsAccount',           discriminator: [220, 175, 137, 218, 31,  174, 154, 106] },
    { name: 'tamagotchiNftAccount', discriminator: [242, 23,  107, 22,  102, 49,  226, 38]  },
  ],
  types: [
    // ── Account struct definitions (camelCase names match accounts[] above) ──
    {
      name: 'potAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority',           type: 'publicKey' },
          { name: 'name',                type: 'string' },
          { name: 'emoji',               type: 'string' },
          { name: 'vaultBump',           type: 'u8' },
          { name: 'potBump',             type: 'u8' },
          { name: 'totalShares',         type: 'u64' },
          { name: 'memberCount',         type: 'u32' },
          { name: 'tradeCount',          type: 'u32' },
          { name: 'totalVolume',         type: 'u64' },
          { name: 'tamagotchiLevel',     type: 'u8' },
          { name: 'tamagotchiXp',        type: 'u64' },
          { name: 'communityTokenMint',  type: 'publicKey' },
          { name: 'config',              type: { defined: 'PotConfig' } },
          { name: 'governance',          type: { defined: 'GovSettings' } },
          { name: 'nextProposalId',      type: 'u64' },
          { name: 'createdAt',           type: 'i64' },
          { name: 'highWaterMark',       type: 'u64' },
          { name: 'protocolFeeBps',      type: 'u16' },
          { name: 'lastActivityAt',      type: 'i64' },
          { name: 'agentPubkey',         type: { option: 'publicKey' } },
          { name: 'agentMaxTradeBps',    type: 'u16' },
          { name: 'agentLastProposalAt', type: 'i64' },
          { name: 'dailyTradesCount',    type: 'u8' },
          { name: 'lastTradeDay',        type: 'i64' },
          { name: 'tokenMint',           type: 'publicKey' },
          { name: 'sharesPerSol',        type: 'u64' },
        ],
      },
    },
    {
      name: 'memberAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot',            type: 'publicKey' },
          { name: 'wallet',         type: 'publicKey' },
          { name: 'shares',         type: 'u64' },
          { name: 'depositTotal',   type: 'u64' },
          { name: 'withdrawTotal',  type: 'u64' },
          { name: 'joinedAt',       type: 'i64' },
          { name: 'lastDepositAt',  type: 'i64' },
          { name: 'bump',           type: 'u8' },
        ],
      },
    },
    {
      name: 'proposalAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot',                  type: 'publicKey' },
          { name: 'proposalId',           type: 'u64' },
          { name: 'proposer',             type: 'publicKey' },
          { name: 'proposalType',         type: { defined: 'ProposalType' } },
          { name: 'description',          type: 'string' },
          { name: 'status',               type: { defined: 'ProposalStatus' } },
          { name: 'yesShares',            type: 'u64' },
          { name: 'noShares',             type: 'u64' },
          { name: 'totalSharesSnapshot',  type: 'u64' },
          { name: 'createdAt',            type: 'i64' },
          { name: 'resolvedAt',           type: 'i64' },
          { name: 'bump',                 type: 'u8' },
        ],
      },
    },
    {
      name: 'voterRecord',
      type: {
        kind: 'struct',
        fields: [
          { name: 'proposal',   type: 'publicKey' },
          { name: 'voter',      type: 'publicKey' },
          { name: 'votedYes',   type: 'bool' },
          { name: 'votedAt',    type: 'i64' },
          { name: 'bump',       type: 'u8' },
        ],
      },
    },
    {
      name: 'privatePotAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot',            type: 'publicKey' },
          { name: 'inviteCodeHash', type: { array: ['u8', 32] } },
          { name: 'bump',           type: 'u8' },
        ],
      },
    },
    {
      name: 'snsAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot',          type: 'publicKey' },
          { name: 'domain',       type: 'string' },
          { name: 'registeredAt', type: 'i64' },
          { name: 'bump',         type: 'u8' },
        ],
      },
    },
    {
      name: 'tamagotchiNftAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'pot',           type: 'publicKey' },
          { name: 'mint',          type: 'publicKey' },
          { name: 'level',         type: 'u8' },
          { name: 'xp',            type: 'u64' },
          { name: 'lastEvolvedAt', type: 'i64' },
          { name: 'bump',          type: 'u8' },
        ],
      },
    },
    // ── Instruction parameter types (unchanged) ───────────────────────────
    {
      name: 'CreatePotParams',
      type: {
        kind: 'struct',
        fields: [
          { name: 'name',                   type: 'string' },
          { name: 'emoji',                  type: 'string' },
          { name: 'isPublic',               type: 'bool' },
          { name: 'minDeposit',             type: 'u64' },
          { name: 'lockupSeconds',          type: 'i64' },
          { name: 'yieldStrategy',          type: 'u8' },
          { name: 'maxYieldAllocationBps',  type: 'u16' },
          { name: 'tradeLevel',             type: 'u8' },
          { name: 'withdrawLevel',          type: 'u8' },
          { name: 'memberChangeLevel',      type: 'u8' },
          { name: 'settingsChangeLevel',    type: 'u8' },
          { name: 'yieldChangeLevel',       type: 'u8' },
          { name: 'voteTimeoutSeconds',     type: 'i64' },
          { name: 'quorumBps',              type: 'u16' },
          { name: 'maxTradeSizeBps',        type: 'u16' },
          { name: 'maxMembers',             type: 'u16' },
        ],
      },
    },
    {
      name: 'CreateProposalParams',
      type: {
        kind: 'struct',
        fields: [
          { name: 'proposalType', type: { defined: 'ProposalType' } },
          { name: 'description',  type: 'string' },
        ],
      },
    },
    {
      name: 'ExecuteSwapParams',
      type: {
        kind: 'struct',
        fields: [
          { name: 'fromMint',     type: 'publicKey' },
          { name: 'toMint',       type: 'publicKey' },
          { name: 'amountIn',     type: 'u64' },
          { name: 'minAmountOut', type: 'u64' },
        ],
      },
    },
    {
      name: 'PotConfig',
      type: {
        kind: 'struct',
        fields: [
          { name: 'isPublic',              type: 'bool' },
          { name: 'minDeposit',            type: 'u64' },
          { name: 'lockupSeconds',         type: 'i64' },
          { name: 'yieldStrategy',         type: { defined: 'YieldStrategy' } },
          { name: 'maxYieldAllocationBps', type: 'u16' },
          { name: 'maxTradeSizeBps',       type: 'u16' },
          { name: 'maxMembers',            type: 'u16' },
        ],
      },
    },
    {
      name: 'GovSettings',
      type: {
        kind: 'struct',
        fields: [
          { name: 'tradeLevel',          type: 'u8' },
          { name: 'withdrawLevel',       type: 'u8' },
          { name: 'memberChangeLevel',   type: 'u8' },
          { name: 'settingsChangeLevel', type: 'u8' },
          { name: 'yieldChangeLevel',    type: 'u8' },
          { name: 'voteTimeoutSeconds',  type: 'i64' },
          { name: 'quorumBps',           type: 'u16' },
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
              { name: 'fromMint',     type: 'publicKey' },
              { name: 'toMint',       type: 'publicKey' },
              { name: 'amountIn',     type: 'u64' },
              { name: 'minAmountOut', type: 'u64' },
            ],
          },
          {
            name: 'Withdraw',
            fields: [
              { name: 'beneficiary', type: 'publicKey' },
              { name: 'amount',      type: 'u64' },
            ],
          },
          {
            name: 'ChangeSettings',
            fields: [
              { name: 'newTradeLevel',    type: 'u8' },
              { name: 'newWithdrawLevel', type: 'u8' },
            ],
          },
          {
            name: 'ChangeYield',
            fields: [{ name: 'newStrategy', type: 'u8' }],
          },
          {
            name: 'AddMember',
            fields: [{ name: 'wallet', type: 'publicKey' }],
          },
          {
            name: 'RemoveMember',
            fields: [{ name: 'wallet', type: 'publicKey' }],
          },
          {
            name: 'SetAgent',
            fields: [
              { name: 'agent',        type: 'publicKey' },
              { name: 'maxTradeBps',  type: 'u16' },
            ],
          },
          {
            name: 'TransferFunds',
            fields: [
              { name: 'to',      type: 'publicKey' },
              { name: 'amount',  type: 'u64' },
              { name: 'purpose', type: 'string' },
            ],
          },
          {
            name: 'UpdateRiskConfig',
            fields: [
              { name: 'maxTradeSizeBps', type: 'u16' },
              { name: 'maxMembers',      type: 'u16' },
            ],
          },
          {
            name: 'TokenizePot',
            fields: [{ name: 'maxSupply', type: 'u64' }],
          },
          {
            name: 'DepositToYield',
            fields: [
              { name: 'amount',   type: 'u64' },
              { name: 'protocol', type: 'u8' },
            ],
          },
          {
            name: 'WithdrawFromYield',
            fields: [
              { name: 'amount',   type: 'u64' },
              { name: 'protocol', type: 'u8' },
            ],
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
    { code: 6000, name: 'InvalidName',                msg: 'POT name must be 1-32 characters' },
    { code: 6001, name: 'DepositTooSmall',            msg: 'Deposit below minimum' },
    { code: 6002, name: 'InsufficientShares',         msg: 'Not enough shares to withdraw' },
    { code: 6003, name: 'LockupActive',               msg: 'Lockup period has not elapsed' },
    { code: 6004, name: 'Unauthorized',               msg: 'Unauthorized action' },
    { code: 6005, name: 'NotPublic',                  msg: 'POT is not public' },
    { code: 6006, name: 'ProposalNotActive',          msg: 'Proposal is not active' },
    { code: 6007, name: 'AlreadyVoted',               msg: 'Already voted on this proposal' },
    { code: 6008, name: 'ProposalNotPassed',          msg: 'Proposal has not passed' },
    { code: 6009, name: 'ProposalAlreadyExecuted',    msg: 'Proposal already executed' },
    { code: 6010, name: 'GovernanceBlocked',          msg: 'Governance level blocks this action' },
    { code: 6011, name: 'MathOverflow',               msg: 'Math overflow' },
    { code: 6012, name: 'InsufficientVaultBalance',   msg: 'Insufficient vault balance' },
    { code: 6013, name: 'MemberNotFound',             msg: 'Member account not found' },
    { code: 6014, name: 'InvalidYieldStrategy',       msg: 'Invalid yield strategy' },
    { code: 6015, name: 'QuorumNotReached',           msg: 'Quorum not reached' },
  ],
} as const

export default IDL

export type PotVault = typeof IDL
