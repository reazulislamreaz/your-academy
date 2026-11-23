import { randomUUID } from 'crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailBrand } from './layout';
import type { TemplateEmail } from './templates';

/**
 * Transactional email over SMTP (DEC-050). Provider-agnostic: Resend in production
 * (smtp.resend.com, user `resend`, password = API key), Mailhog locally.
 *
 * Deliverability rules enforced here:
 * - From is an address on our own domain (DKIM/SPF-aligned via the provider);
 * - every message is multipart (HTML + plain text) with a Message-ID on that domain;
 * - Reply-To points at a real inbox (support@…);
 * - send results and failures are logged with a masked recipient, never the link.
 */

const FREE_MAIL_DOMAINS = ['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

export type EmailConfig = {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
  fromDomain: string;
  replyTo: string | null;
  brand: EmailBrand;
};

function domainOf(address: string): string {
  const match = /@([^>\s]+)>?\s*$/.exec(address);
  return (match?.[1] ?? '').toLowerCase();
}

export function loadEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig {
  const siteUrl = (env.APP_PUBLIC_URL || env.WEB_ORIGIN?.split(',')[0] || 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '');
  const from = env.EMAIL_FROM?.trim() || 'Your Academy <no-reply@your-academy.local>';
  const port = Number(env.SMTP_PORT ?? 1025);
  const replyTo = env.EMAIL_REPLY_TO?.trim() || null;
  return {
    host: env.SMTP_HOST?.trim() || null,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    user: env.SMTP_USER?.trim() || null,
    pass: env.SMTP_PASS || null,
    from,
    fromDomain: domainOf(from),
    replyTo,
    brand: {
      name: env.EMAIL_BRAND_NAME?.trim() || 'Your Academy',
      siteUrl,
      logoUrl: env.EMAIL_LOGO_URL?.trim() || `${siteUrl}/images/email-logo.png`,
      supportEmail: env.EMAIL_SUPPORT_ADDRESS?.trim() || replyTo,
    },
  };
}

/** Warnings worth surfacing at boot — misconfigurations that send mail to spam. */
export function emailConfigWarnings(config: EmailConfig, isProduction: boolean): string[] {
  const warnings: string[] = [];
  if (FREE_MAIL_DOMAINS.includes(config.fromDomain)) {
    warnings.push(
      `EMAIL_FROM uses ${config.fromDomain}; send from your own domain (e.g. support@youracademy.com.bd) so SPF/DKIM/DMARC align`,
    );
  }
  if (isProduction && !config.brand.siteUrl.startsWith('https://')) {
    warnings.push(`APP_PUBLIC_URL / WEB_ORIGIN should be https in production (got ${config.brand.siteUrl})`);
  }
  if (isProduction && config.host && (!config.user || !config.pass)) {
    warnings.push('SMTP_USER / SMTP_PASS are not set — most providers reject unauthenticated mail');
  }
  return warnings;
}

/** "someone@gmail.com" → "so***@gmail.com" for logs. */
export function maskEmail(address: string): string {
  const [local, domain] = address.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

export type SendOutcome = { status: 'sent' | 'logged'; messageId: string };

export function createEmailSender(config: EmailConfig, opts: { isProduction: boolean; log?: (m: string) => void }) {
  const log = opts.log ?? ((m: string) => console.log(m));
  let transporter: Transporter | null = null;

  function getTransport(): Transporter {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: config.host ?? undefined,
        port: config.port,
        secure: config.secure,
        auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
      });
    }
    return transporter;
  }

  return async function send(kind: string, to: string, email: TemplateEmail, devLink: string): Promise<SendOutcome> {
    const messageId = `<${randomUUID()}@${config.fromDomain || 'localhost'}>`;

    if (!config.host) {
      // Never log links outside local development — they are bearer secrets.
      if (opts.isProduction) {
        throw new Error(`SMTP_HOST is required in production to deliver ${kind} emails (refusing to log links)`);
      }
      log(`[email] ${kind} → ${maskEmail(to)}: SMTP_HOST unset, link=${devLink}`);
      return { status: 'logged', messageId };
    }

    try {
      const info = await getTransport().sendMail({
        from: config.from,
        to,
        replyTo: config.replyTo ?? undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
        messageId,
        headers: {
          // Stops Gmail collapsing repeated reset emails into one thread.
          'X-Entity-Ref-ID': randomUUID(),
          'Auto-Submitted': 'auto-generated',
        },
      });
      const rejected = (info.rejected ?? []).map((r) => maskEmail(String(r)));
      log(
        `[email] ${kind} → ${maskEmail(to)} sent messageId=${info.messageId ?? messageId} response="${String(info.response ?? '').slice(0, 120)}"${rejected.length ? ` rejected=${rejected.join(',')}` : ''}`,
      );
      if (rejected.length) throw new Error(`SMTP rejected recipient for ${kind}`);
      return { status: 'sent', messageId: info.messageId ?? messageId };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      log(`[email] ${kind} → ${maskEmail(to)} FAILED: ${detail.slice(0, 300)}`);
      if (!opts.isProduction) {
        log(`[email] dev fallback link=${devLink}`);
        return { status: 'logged', messageId };
      }
      throw err; // BullMQ retries with backoff.
    }
  };
}
