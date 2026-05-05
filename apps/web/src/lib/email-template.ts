/**
 * PotBot branded HTML email template — launch / product-update style.
 *
 * Inline styles only (email clients don't support external CSS / most classes).
 * Dark theme matching the PotBot landing page, with a colour-blocked hero
 * and a single CTA button.
 *
 * Usage:
 *   renderEmail({
 *     subject: "PotBot devnet is live",
 *     preheader: "Founding members — your early access has landed.",
 *     headline: "Devnet is live",
 *     body: "<p>You asked to be first. You are.</p>",
 *     ctaLabel: "Open PotBot",
 *     ctaUrl: "https://potbot.fun",
 *   })
 */

export interface EmailTemplateInput {
  /** Subject line — also used in <title>. */
  subject: string
  /** Preview text shown in inbox (1-line teaser after subject). Max ~90 chars. */
  preheader?: string
  /** Big headline inside the email body. */
  headline: string
  /** Body HTML. Can contain <p>, <ul>, <strong>, <a>, etc. */
  body: string
  /** Optional primary CTA button. If omitted, no button is rendered. */
  ctaLabel?: string
  /** URL for the CTA button. */
  ctaUrl?: string
  /** Recipient's email, rendered in the unsubscribe footer. */
  recipientEmail?: string
  /** Optional unsubscribe URL. */
  unsubscribeUrl?: string
}

/* PotBot brand palette (from apps/web/src/app/globals.css + LandingPage.tsx) */
const C = {
  bgOuter: '#0D1117', // pot-dark
  bgCard: '#111827', // pot-card
  border: '#1A2332', // pot-border
  green: '#14F195', // pot-green (Solana green)
  accent: '#9945FF', // pot-accent (Solana purple)
  text: '#FFFFFF',
  muted: '#6B7280', // pot-muted
  mutedSoft: '#9CA3AF',
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function renderEmail(input: EmailTemplateInput): string {
  const {
    subject,
    preheader = '',
    headline,
    body,
    ctaLabel,
    ctaUrl,
    recipientEmail,
    unsubscribeUrl,
  } = input

  const cta =
    ctaLabel && ctaUrl
      ? `
      <tr>
        <td align="center" style="padding: 16px 24px 8px;">
          <a href="${escapeHtml(ctaUrl)}"
             style="display:inline-block;background:${C.green};color:${C.bgOuter};
                    font-weight:800;font-size:16px;text-decoration:none;
                    padding:14px 32px;border-radius:9999px;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${escapeHtml(ctaLabel)} →
          </a>
        </td>
      </tr>`
      : ''

  const footerLinks =
    unsubscribeUrl || recipientEmail
      ? `
        <div style="color:${C.muted};font-size:11px;margin-top:8px;">
          ${recipientEmail ? `Sent to ${escapeHtml(recipientEmail)}. ` : ''}
          ${
            unsubscribeUrl
              ? `<a href="${escapeHtml(unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a>`
              : ''
          }
        </div>`
      : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bgOuter};
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;
               color:${C.text};-webkit-font-smoothing:antialiased;">

    <!-- Preheader (hidden in body, shown in inbox preview) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bgOuter};padding:32px 16px;">
      <tr>
        <td align="center">

          <!-- Container -->
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="max-width:600px;width:100%;background:${C.bgCard};
                        border:1px solid ${C.border};border-radius:20px;overflow:hidden;">

            <!-- Header / brand strip -->
            <tr>
              <td style="background:linear-gradient(135deg, ${C.green}14 0%, ${C.accent}14 100%);
                         padding:24px 32px;border-bottom:1px solid ${C.border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      <span style="font-size:22px;font-weight:900;color:${C.text};letter-spacing:-0.5px;">
                        <span style="font-size:24px;">🪴</span>
                        &nbsp;PotBot
                      </span>
                    </td>
                    <td align="right">
                      <span style="font-size:11px;color:${C.muted};">Group DeFi on Solana</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Hero headline -->
            <tr>
              <td style="padding:40px 32px 16px;">
                <h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:900;color:${C.text};letter-spacing:-0.5px;">
                  ${escapeHtml(headline)}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:8px 32px 16px;font-size:16px;line-height:1.6;color:${C.mutedSoft};">
                ${body}
              </td>
            </tr>

            <!-- CTA -->
            ${cta}

            <!-- Divider -->
            <tr>
              <td style="padding:24px 32px 0;">
                <div style="height:1px;background:${C.border};"></div>
              </td>
            </tr>

            <!-- Socials -->
            <tr>
              <td align="center" style="padding:20px 32px 24px;font-size:13px;color:${C.muted};">
                <a href="https://potbot.fun" style="color:${C.green};text-decoration:none;margin:0 10px;">Website</a>
                ·
                <a href="https://x.com/PotBot_sol" style="color:${C.green};text-decoration:none;margin:0 10px;">Twitter</a>
                ·
                <a href="https://github.com/YD811/potbot-v2" style="color:${C.green};text-decoration:none;margin:0 10px;">GitHub</a>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div style="max-width:600px;margin:16px auto 0;text-align:center;color:${C.muted};font-size:12px;line-height:1.5;">
            <div>Built for Solana Frontier 2026 · Group DeFi Vaults</div>
            ${footerLinks}
          </div>

        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * Plain-text fallback (for email clients / spam filters).
 * Strips HTML and keeps the CTA as a trailing link.
 */
export function renderEmailPlainText(input: EmailTemplateInput): string {
  const lines: string[] = []
  lines.push('🪴 PotBot — Group DeFi on Solana')
  lines.push('')
  lines.push(input.headline)
  lines.push('')
  lines.push(
    input.body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
  if (input.ctaLabel && input.ctaUrl) {
    lines.push('')
    lines.push(`${input.ctaLabel}: ${input.ctaUrl}`)
  }
  lines.push('')
  lines.push('—')
  lines.push('potbot.fun · https://x.com/PotBot_sol')
  if (input.unsubscribeUrl) {
    lines.push(`Unsubscribe: ${input.unsubscribeUrl}`)
  }
  return lines.join('\n')
}
