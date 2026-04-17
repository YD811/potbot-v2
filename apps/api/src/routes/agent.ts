import { Hono } from 'hono'
import { registerAgent, unregisterAgent, getAgentLogs } from '../services/agent-cron.js'
import type { AgentRule } from '../types.js'

export const agentRouter = new Hono()

// In-memory rules store (replace with Supabase in production)
const rulesStore = new Map<string, AgentRule[]>()

// GET /agent/:pubkey/rules
agentRouter.get('/:pubkey/rules', (c) => {
  const pubkey = c.req.param('pubkey')
  const rules = rulesStore.get(pubkey) ?? []
  return c.json({ rules, potPubkey: pubkey, count: rules.length })
})

// POST /agent/:pubkey/rules
agentRouter.post('/:pubkey/rules', async (c) => {
  const pubkey = c.req.param('pubkey')
  try {
    const body = await c.req.json<{ rules: AgentRule[] }>()
    if (!Array.isArray(body.rules)) return c.json({ error: 'rules must be an array' }, 400)

    // Validate rules
    for (const rule of body.rules) {
      if (!rule.id || !rule.name || !rule.trigger?.type || !rule.action?.type) {
        return c.json({ error: `Invalid rule: ${rule.id ?? 'unknown'}` }, 400)
      }
    }

    rulesStore.set(pubkey, body.rules)
    registerAgent(pubkey, body.rules)
    return c.json({ ok: true, count: body.rules.length, potPubkey: pubkey })
  } catch {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// DELETE /agent/:pubkey/rules
agentRouter.delete('/:pubkey/rules', (c) => {
  const pubkey = c.req.param('pubkey')
  rulesStore.delete(pubkey)
  unregisterAgent(pubkey)
  return c.json({ ok: true, potPubkey: pubkey })
})

// GET /agent/:pubkey/logs
agentRouter.get('/:pubkey/logs', (c) => {
  const pubkey = c.req.param('pubkey')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)
  const logs = getAgentLogs(pubkey, limit)
  return c.json({ logs, potPubkey: pubkey, count: logs.length })
})

// POST /agent/:pubkey/trigger — manually trigger evaluation (demo/testing)
agentRouter.post('/:pubkey/trigger', async (c) => {
  const pubkey = c.req.param('pubkey')
  const rules = rulesStore.get(pubkey) ?? []
  if (rules.length === 0) return c.json({ error: 'No rules configured for this pot' }, 404)
  registerAgent(pubkey, rules)
  return c.json({ ok: true, message: 'Agent triggered — check /logs in a moment', rulesCount: rules.length })
})
