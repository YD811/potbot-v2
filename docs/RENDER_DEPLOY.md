# Render Deploy — `@potbot/mcp` HTTP+SSE

**What's already done:** Blueprint files committed (`apps/potbot-mcp/render.yaml`, `apps/potbot-mcp/Dockerfile`, `apps/potbot-mcp/.dockerignore`). Render auto-detects them.

**What you click (one-time, ~3 min):**

1. **Open** https://dashboard.render.com/blueprints
2. Click **New Blueprint Instance**
3. Pick the `YD811/potbot-v2` repo (authorize GitHub if prompted)
4. Render reads `render.yaml` and proposes one service: `potbot-mcp` (free tier, Docker, branch `main`)
5. Click **Apply**

That's it. First build takes ~3-4 min. Subsequent pushes to `main` auto-deploy (because `autoDeploy: true`).

---

## Service URL

Render assigns one automatically: `https://potbot-mcp-<hash>.onrender.com`.

Pin a friendly subdomain in **Service → Settings → Custom Domains** if you want
`mcp.potbot.fun` (CNAME to the assigned host).

---

## Health check

`GET /health` is wired in `apps/potbot-mcp/src/http.ts`. Render hits it; service flips to "Live" when 200.

```bash
curl https://potbot-mcp-<hash>.onrender.com/health
# → {"status":"ok","version":"0.6.0",...}
```

---

## Free tier note

Free tier idles after 15 min of inactivity. First request after idle takes 30-60s
cold-start. For demo purposes that's fine. For production:

- **Service → Settings → Instance Type → Starter ($7/mo)** — always-on, no cold starts.

---

## Optional env (set via dashboard, not committed)

| Var | When to set | What |
|---|---|---|
| `X402_RECEIVER_WALLET` | If you want to gate analytics tools by 0.001 USDC payment | Solana mainnet wallet that receives x402 payments |
| `X402_ENABLED` | After `X402_RECEIVER_WALLET` is set | Flip to `true` |
| `AGENT_KEYPAIR` | Only if this deployment should auto-sign votes/proposals | Base58 secret key. **Don't** set on the public demo deployment — clients should bring their own. |
| `LUNARCRUSH_API_KEY` | If you want Twitter sentiment in `get_social_sentiment` | LunarCrush API key |
| `CRYPTOPANIC_API_KEY` | If you want news sentiment | CryptoPanic auth token |

Defaults already in `render.yaml` cover devnet RPC + program ID + free demo mode.

---

## After deploy — verify it from Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "potbot-remote": {
      "url": "https://potbot-mcp-<hash>.onrender.com/sse"
    }
  }
}
```

Restart Claude Desktop, open a new chat, type `/mcp` — should list `potbot-remote` with all 18 tools.

Test path: ask Claude to call `list_vaults` then `get_market_analytics(SOL)`. First call wakes the free instance; second is fast.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails on `npm ci` | Verify `apps/potbot-mcp/package-lock.json` is committed. Render Docker build runs from repo root, copies workspace. |
| `Cannot find module` at runtime | Workspace deps need to be built before MCP. Dockerfile already runs `npm run build` for the package. |
| Health check 502 | First boot takes 30-60s; Render retries. If persistent, check **Logs** tab for runtime errors (likely missing env). |
| `/sse` endpoint hangs | Expected — SSE keeps connection open. Use the test config above; don't `curl` it directly. |
| Cold-start too slow for production | Switch to Starter plan ($7/mo). |

---

## Update flow

Push to `main` → Render auto-deploys. To pin a release:

```bash
git tag mcp-v0.7.0 && git push --tags
# CI republishes to npm (.github/workflows/publish.yml) and triggers Render redeploy.
```
