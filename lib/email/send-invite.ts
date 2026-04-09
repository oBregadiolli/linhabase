/**
 * Email sending helper for LinhaBase.
 *
 * Provider: Resend (https://resend.com)
 *
 * Why Resend?
 *   1. Modern REST API — simple SDK, no SMTP config
 *   2. Free tier: 100 emails/day, 3000/month — sufficient for invitation volume
 *   3. Excellent DX: TypeScript-native, minimal setup
 *   4. Domain verification via DNS (not required for testing with onboarding@resend.dev)
 *   5. Built-in delivery tracking and bounce handling
 *
 * Required env vars (server-only, never exposed to client):
 *   RESEND_API_KEY — API key from https://resend.com/api-keys
 *   RESEND_FROM_EMAIL — Verified sender (e.g. "LinhaBase <noreply@linhabase.com>")
 *                        Use "onboarding@resend.dev" for testing before domain verification
 *   NEXT_PUBLIC_APP_URL — Base URL for invite links (e.g. https://linhabase.com)
 *
 * This helper is designed to be reusable for future email types
 * (password reset confirmations, weekly reports, etc.)
 */

import { Resend } from 'resend'

// Lazy singleton — initialized on first use, fails gracefully if unconfigured
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not configured — email sending disabled')
    return null
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// ── Public API ────────────────────────────────────────────────

export interface SendInviteEmailParams {
  to: string
  companyName: string
  role: string
  token: string
  expiresAt: string // ISO 8601
}

export interface EmailResult {
  sent: boolean
  error?: string
}

/**
 * Send an invitation email. Returns { sent: true } on success,
 * or { sent: false, error } on failure.
 *
 * If RESEND_API_KEY is not configured, returns { sent: false }
 * silently — the invitation record is still valid and the admin
 * can copy the link manually.
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<EmailResult> {
  const resend = getResendClient()

  if (!resend) {
    return { sent: false, error: 'Provedor de email não configurado.' }
  }

  const { to, companyName, role, token, expiresAt } = params
  const appUrl = getAppUrl()
  const inviteUrl = `${appUrl}/invite?token=${token}`

  const expiresDate = new Date(expiresAt)
  const formattedExpiry = expiresDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const roleLabel = role === 'admin' ? 'Administrador' : 'Membro'

  try {
    const { error } = await resend.emails.send({
      from: getFromEmail(),
      to: [to],
      subject: `Você foi convidado para ${companyName} — LinhaBase`,
      html: buildInviteHtml({
        companyName,
        roleLabel,
        formattedExpiry,
        inviteUrl,
        recipientEmail: to,
      }),
    })

    if (error) {
      console.error('[email] Resend API error:', error)
      return { sent: false, error: 'Falha ao enviar email de convite.' }
    }

    return { sent: true }
  } catch (err) {
    console.error('[email] Unexpected error:', err)
    return { sent: false, error: 'Erro inesperado ao enviar email.' }
  }
}

// ── HTML Template ─────────────────────────────────────────────

interface InviteHtmlParams {
  companyName: string
  roleLabel: string
  formattedExpiry: string
  inviteUrl: string
  recipientEmail: string
}

function buildInviteHtml(params: InviteHtmlParams): string {
  const { companyName, roleLabel, formattedExpiry, inviteUrl, recipientEmail } = params

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite — ${escapeHtml(companyName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #3730A3; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">
                LinhaBase
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 700;">
                Você foi convidado!
              </h2>
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong style="color: #374151;">${escapeHtml(companyName)}</strong> convidou
                <strong style="color: #374151;">${escapeHtml(recipientEmail)}</strong> para se juntar
                à equipe como <strong style="color: #374151;">${escapeHtml(roleLabel)}</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${escapeHtml(inviteUrl)}"
                       style="display: inline-block; background-color: #3730A3; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.01em;">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">
                      <strong style="color: #374151;">Empresa:</strong> ${escapeHtml(companyName)}
                    </p>
                    <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">
                      <strong style="color: #374151;">Papel:</strong> ${escapeHtml(roleLabel)}
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                      <strong style="color: #374151;">Válido até:</strong> ${escapeHtml(formattedExpiry)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                Se o botão não funcionar, copie e cole este link no navegador:<br />
                <a href="${escapeHtml(inviteUrl)}" style="color: #3730A3; word-break: break-all; font-size: 11px;">
                  ${escapeHtml(inviteUrl)}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                Este email foi enviado por LinhaBase em nome de ${escapeHtml(companyName)}.
                <br />Se você não esperava este convite, pode ignorar esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Escape HTML special chars to prevent XSS in email template */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
