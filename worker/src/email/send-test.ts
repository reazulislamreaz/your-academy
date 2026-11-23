/**
 * Send sample emails to check inbox placement and rendering (Gmail, Outlook, mail-tester.com).
 *
 *   pnpm --filter @your-academy/worker email:test you@gmail.com
 *   # on the server:
 *   docker compose -f docker/docker-compose.prod.yml exec worker node dist/email/send-test.js you@outlook.com
 *
 * Uses the same SMTP settings and templates as real emails. The links are harmless
 * samples (the token is not valid), so it is safe to send to any address.
 */
import { createEmailSender, emailConfigWarnings, loadEmailConfig } from './send';
import { emailVerificationEmail, passwordResetEmail } from './templates';

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.error('Usage: email:test <recipient@example.com> [reset|verify|both]');
    process.exit(1);
  }
  const which = process.argv[3] ?? 'reset';
  const config = loadEmailConfig();
  for (const warning of emailConfigWarnings(config, process.env.NODE_ENV === 'production')) {
    console.warn(`warning: ${warning}`);
  }
  const send = createEmailSender(config, { isProduction: true });
  const base = config.brand.siteUrl;

  if (which === 'reset' || which === 'both') {
    const url = `${base}/reset-password?token=sample-not-a-real-token`;
    const out = await send('password-reset (test)', to, passwordResetEmail(config.brand, { resetUrl: url, expiresInMinutes: 30 }), url);
    console.log(`password reset sample: ${out.status} ${out.messageId}`);
  }
  if (which === 'verify' || which === 'both') {
    const url = `${base}/verify-email?token=sample-not-a-real-token`;
    const out = await send('email-verification (test)', to, emailVerificationEmail(config.brand, { verifyUrl: url, expiresInMinutes: 1440 }), url);
    console.log(`email verification sample: ${out.status} ${out.messageId}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
