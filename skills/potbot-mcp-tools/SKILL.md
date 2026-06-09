---
name: potbot-mcp-tools
description: >-
  Build, extend, and test the PotBot MCP server (@potbot/mcp, solana-agent-kit based).
  Use when adding or changing MCP tools, wiring x402 micropayment gating, exposing vault
  actions to AI agents, or debugging the MCP server. Triggers on "add an MCP tool",
  "mcp server", "expose to agents", "x402", "добавь mcp инструмент".
---

# PotBot — MCP tools

PotBot is MCP-native: any AI agent (Claude/GPT/custom) acts on vaults through `@potbot/mcp`
(`apps/potbot-mcp`), built on solana-agent-kit, with http+sse+stdio transports. Read
`docs/integrations/mcp.md` first. This is a product differentiator — keep it clean and documented.

## Existing tools (pattern to follow)
`list_pots / list_vaults · get_pot_analytics(pubkey) · get_yield_rates · create_proposal{pot,swap} ·
vote_on_proposal{proposal,approve} · join_vault{vault,referrer}` (18 tools total).

## Adding a tool
1. Define it in `apps/potbot-mcp` next to existing tools: name, description, zod/JSON input schema.
2. Implement via the SDK (`@potbot/sdk`) or backend API — never re-implement chain logic inline.
3. Read vs write:
   - Reads (analytics, lists, rates): safe, cacheable.
   - Writes (propose, vote, join): build the tx; respect governance. An agent NEVER moves funds
     directly — it proposes; humans/personal-voters approve. No tool should bypass votes.
4. x402 gating: revenue/heavy endpoints (e.g. `/analytics/*`) require a 0.001 USDC micropayment per
   call. Keep the gate consistent; document which tools are gated.
5. Errors: return structured, actionable errors (bad pubkey, not found, unauthorized, quorum not met).
6. Update `docs/integrations/mcp.md` and the README tool list + bump the npm version.

## Testing
```bash
npx @potbot/mcp                # run locally
# Smoke flow with an agent / Claude:
list_vaults → get_vault_analytics → create_swap_proposal → vote_on_proposal
```
- Test stdio, http, and sse transports.
- Verify a write tool produces a valid unsigned/ço-signed tx and respects governance (rejects when
  quorum not met, frozen pot, or cap breach).
- Verify x402-gated tools reject unpaid calls and accept paid ones.

## Conventions
- Tool names: lowercase snake, verb_object (`create_proposal`, `get_pot_analytics`).
- Descriptions are agent-facing: say exactly what it does and what it returns.
- Keep parity with the SDK; the MCP server is a thin, well-described layer over SDK + API.
- Mark each tool read/write and gated/free in docs so agent devs know the cost + side effects.
