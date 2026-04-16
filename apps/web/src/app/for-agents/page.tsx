'use client';

import React from 'react';
import Link from 'next/link';

export default function ForAgentsPage() {
  const [copiedConfig, setCopiedConfig] = React.useState(false);

  const handleCopyConfig = () => {
    const config = JSON.stringify({ mcpServers: { potbot: { command: 'npx', args: ['@potbot/mcp-server'], description: 'PotBot DeFi Strategy Vault Manager', } } }, null, 2);
    navigator.clipboard.writeText(config);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  return (
    <div style={{ backgroundColor: '#0D1117', color: 'white', minHeight: '100vh', fontFamily: 'Geist, sans-serif' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1A2332' }}>
        <Link href="/vaults" style={{ color: '#8B9BB4', textDecoration: 'none', fontSize: '14px' }}>← Back to Vaults</Link>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #9945FF 0%, #0D1117 100%)', padding: '80px 24px', textAlign: 'center', }}>
        <h1 style={{ fontSize: '48px', fontWeight: '700', marginBottom: '16px', margin: '0 0 16px 0' }}>PotBot for AI Agents</h1>
        <p style={{ fontSize: '18px', color: '#D1D5DB', maxWidth: '700px', margin: '0 auto 32px', lineHeight: '1.6', }}>
          The first MCP-native DeFi protocol. Your AI agent can autonomously discover, simulate, and join Strategy Vaults to manage treasury allocations on Solana.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://github.com/potbot/mcp-server" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 24px', border: '2px solid #14F195', borderRadius: '6px', color: '#14F195', textDecoration: 'none', fontWeight: '600', fontSize: '14px', cursor: 'pointer', }}>View on GitHub</a>
          <button style={{ padding: '12px 24px', backgroundColor: '#14F195', color: '#0D1117', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', }}>Install MCP Server</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '80px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '48px', textAlign: 'center' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1A2332', borderRadius: '8px', padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>1️⃣</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Install</h3>
            <p style={{ color: '#8B9BB4', marginBottom: '16px', fontSize: '14px' }}>Add the MCP server to your Claude or Cursor configuration.</p>
            <code style={{ backgroundColor: '#0D1117', padding: '12px', borderRadius: '4px', fontSize: '13px', display: 'block', overflow: 'auto', }}>npm install -g @potbot/mcp-server</code>
          </div>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1A2332', borderRadius: '8px', padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>2️⃣</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Configure</h3>
            <p style={{ color: '#8B9BB4', marginBottom: '16px', fontSize: '14px' }}>Update your MCP settings with PotBot server configuration.</p>
            <code style={{ backgroundColor: '#0D1117', padding: '12px', borderRadius: '4px', fontSize: '12px', display: 'block', overflow: 'auto', }}>{`{\n  "mcpServers": {\n    "potbot": {...}\n  }\n}`}</code>
          </div>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1A2332', borderRadius: '8px', padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>3️⃣</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Ask Your AI</h3>
            <p style={{ color: '#8B9BB4', marginBottom: '16px', fontSize: '14px' }}>Ask your AI to discover vaults and manage allocations naturally.</p>
            <code style={{ backgroundColor: '#0D1117', padding: '12px', borderRadius: '4px', fontSize: '13px', display: 'block', overflow: 'auto', }}>"Allocate $10K across low-risk vaults"</code>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '80px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '48px', textAlign: 'center' }}>Use Cases</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#111827', border: '2px solid #9945FF', borderRadius: '8px', padding: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏛️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>DAO Treasury Management</h3>
            <p style={{ color: '#8B9BB4', fontSize: '14px', lineHeight: '1.6' }}>Autonomously allocate DAO treasury across risk profiles and strategies based on governance parameters.</p>
          </div>
          <div style={{ backgroundColor: '#111827', border: '2px solid #9945FF', borderRadius: '8px', padding: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Portfolio Diversification</h3>
            <p style={{ color: '#8B9BB4', fontSize: '14px', lineHeight: '1.6' }}>Spread capital across multiple strategies based on risk parameters and market conditions.</p>
          </div>
          <div style={{ backgroundColor: '#111827', border: '2px solid #9945FF', borderRadius: '8px', padding: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤖</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Run Your Own Vault</h3>
            <p style={{ color: '#8B9BB4', fontSize: '14px', lineHeight: '1.6' }}>AI agents can create and manage their own Strategy Vault to offer algorithmic trading strategies.</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '80px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '48px', textAlign: 'center' }}>Available Tools</h2>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1A2332', borderRadius: '8px', overflow: 'hidden', }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1A2332', backgroundColor: '#0D1117' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Tool</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[{ name: 'list_strategy_vaults', desc: 'Filter vaults by strategy, risk, min PnL', }, { name: 'get_vault_details', desc: 'Full vault info with fee breakdown', }, { name: 'simulate_join_vault', desc: 'Pre-flight fee check + projected returns', }, { name: 'calculate_allocation', desc: 'Optimal split for budget + risk profile', }, { name: 'get_my_positions', desc: 'Portfolio view with total PnL', }, { name: 'get_leaderboard', desc: 'Top vaults by PnL / AUM / members', }, { name: 'get_vault_performance', desc: 'NAV history, Sharpe, drawdown, win rate', }].map((tool, idx) => (
                <tr key={idx} style={{ borderBottom: idx < 6 ? '1px solid #1A2332' : 'none', }}>
                  <td style={{ padding: '16px', fontSize: '13px' }}><code style={{ backgroundColor: '#0D1117', padding: '4px 8px', borderRadius: '4px' }}>{tool.name}</code></td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#8B9BB4' }}>{tool.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '80px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '48px', textAlign: 'center' }}>Example Conversation</h2>
        <div style={{ backgroundColor: '#0D1117', border: '1px solid #1A2332', borderRadius: '8px', padding: '24px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8', overflow: 'auto', }}>
          <div style={{ color: '#D1D5DB' }}>
            <div style={{ marginBottom: '16px' }}><span style={{ color: '#9945FF' }}>User:</span> I have $10,000 USDC for our DAO treasury. Allocate across low-risk vaults.</div>
            <div style={{ marginBottom: '16px' }}><span style={{ color: '#14F195' }}>AI:</span> <span style={{ color: '#8B9BB4' }}>[calls calculate_allocation(10000, "conservative")]</span></div>
            <div style={{ marginBottom: '16px' }}><span style={{ color: '#14F195' }}>AI:</span> I recommend splitting across 3 vaults:<div style={{ marginLeft: '20px', marginTop: '8px' }}>
              <div>- Yield Farmers DAO (40%) — $4,000 — 4.1% 30d return, level Eagle 🦅</div>
              <div>- AI Treasury Manager (35%) — $3,500 — 9.8% 30d return, level Dragon 🐉</div>
              <div>- Autonomous DCA Engine (25%) — $2,500 — 6.2% 30d return, level Eagle 🦅</div>
            </div></div>
            <div><span style={{ color: '#14F195' }}>AI:</span> Total projected monthly return: ~$67 at current rates. Shall I proceed?</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '80px auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>MCP Config</h2>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1A2332', borderRadius: '8px', padding: '0', position: 'relative', }}>
          <button onClick={handleCopyConfig} style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', backgroundColor: '#14F195', color: '#0D1117', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', zIndex: 10, }}>
            {copiedConfig ? 'Copied ✓' : 'Copy'}
          </button>
          <pre style={{ padding: '24px', margin: 0, fontSize: '13px', overflow: 'auto', color: '#D1D5DB', fontFamily: 'monospace', }}>
            {JSON.stringify({ mcpServers: { potbot: { command: 'npx', args: ['@potbot/mcp-server'], description: 'PotBot DeFi Strategy Vault Manager', } } }, null, 2)}
          </pre>
        </div>
        <p style={{ textAlign: 'center', color: '#8B9BB4', fontSize: '12px', marginTop: '12px' }}>Add this to your <code style={{ color: '#D1D5DB' }}>~/.cursor/mcp.json</code> or Claude desktop config</p>
      </div>
    </div>
  );
}
