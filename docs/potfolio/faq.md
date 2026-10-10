# FAQ

**Is a POTfolio a fund?** No. Nobody manages your money. The basket is fixed at creation and enforced by the program.

**Who holds the assets?** Program-owned accounts with no private key. There is no withdraw instruction.

**What do I get when I leave?** Your pro-rata share of every asset, in kind, minus 0.50% that stays in the Pot. Exit to USDC in one step is in development.

**Can the creator change the basket?** No. The creator can only pause deposits or cap the size. Managed and Community POTfolios come after the Fair.

**Why USDC in?** It keeps the price math simple: the Pot is valued in USD with Pyth and mints at that value. Deposits in other assets are in development.

**Why a 1 USDC minimum?** Dust protection; a smaller deposit would cost more in rent and fees than it is worth.

**Where do prices come from?** Pyth, posted in the same transaction, max 5 minutes old, priced conservatively. Stale prices are refused, so stock POTfolios only take deposits while US markets are open. Exits need no prices.

**What is a keeper?** A bot that buys the basket and keeps it balanced inside limits the program checks on every trade. Anyone can run one.

**How do referrals pay?** 0.12% of every deposit through your link, instantly, in the deposit transaction.

**Can I paste any token address?** Any token with a Pyth (or, later, Switchboard) price feed. On devnet only our test tokens exist, so the list is short; on mainnet it is hundreds at launch.

**What is a Vault?** PotBot v2: a group treasury with members, proposals and votes. POTfolios have holders and a token; Vaults have members and governance.

**What is the Bot?** The agent side: keeps baskets balanced, exposes every Pot to AI agents over MCP, and (in development) sends holders a digest of what grew, what fell and why.
