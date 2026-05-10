# Contributing to POTBOT

POTBOT is open-source infrastructure for tokenized internet communities on Solana. Contributions — code, docs, integrations, audits — are welcome.

## Before you start

- Read the [README](README.md) to understand the protocol
- Skim [`docs/architecture/architecture.md`](docs/architecture/architecture.md) for system design
- Check the [open issues](https://github.com/YD811/potbot-v2/issues) to see what's wanted
- For non-trivial changes, open a discussion or issue first so we can align on approach

## Local setup

```bash
git clone https://github.com/YD811/potbot-v2.git
cd potbot-v2
npm install

# DApp dev server
cd apps/web && npx next dev   # → http://localhost:3000

# Anchor program
cd packages/program && anchor build

# MCP server
cd apps/potbot-mcp && npm run build && node dist/index.js
```

Full setup with devnet wallets, env vars, and Supabase: [`docs/operations/development.md`](docs/operations/development.md).

Copy `.env.example` to `.env.local` (in `apps/web`) and fill in your own keys.

## Workflow

1. Fork the repo and create a feature branch — `git checkout -b feat/short-name`
2. Make your changes. Keep diffs focused: one concern per PR
3. Run the local checks before pushing:
   ```bash
   npm run lint
   npm run build
   ```
4. For onchain changes, run `anchor test` against a local validator
5. Open a PR against `main` with a description explaining **what** changed and **why**

## Code conventions

- TypeScript strict mode is on — fix type errors, don't suppress them
- Tailwind utility classes; design tokens (`pot-dark`, `pot-card`, `pot-border`, `pot-green`, `pot-accent`) live in `apps/web/tailwind.config.ts`
- Rust: `cargo fmt` and `cargo clippy` clean before submitting
- Commits: prefix with the area you're touching, e.g. `program(swap):`, `web(landing):`, `mcp(tools):`, `docs(architecture):`

## Tests

- Anchor program: `cargo test` and `anchor test` in `packages/program/`
- Web: TypeScript check via `npx tsc --noEmit` in `apps/web/`
- MCP: integration scripts in `apps/potbot-mcp/test/`

A PR with green CI is much more likely to land.

## Areas we'd love help on

- Additional MCP tools for new agent flows
- Solana protocol integrations (Kamino, Drift, Meteora yield strategies)
- Onchain test coverage for governance edge cases
- DApp accessibility and i18n
- Documentation, especially worked examples for new POT use cases

## Reporting security issues

**Do not** open a public issue. See [SECURITY.md](SECURITY.md) for the disclosure process.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
