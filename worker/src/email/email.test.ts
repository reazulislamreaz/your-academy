import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEmailSender, emailConfigWarnings, loadEmailConfig, maskEmail } from './send';
import {
  emailChangedNoticeEmail,
  emailVerificationEmail,
  passwordResetEmail,
  subscriptionReminderEmail,
} from './templates';

const prodEnv = {
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://youracademy.com.bd',
  EMAIL_FROM: 'Your Academy <support@youracademy.com.bd>',
  EMAIL_REPLY_TO: 'support@youracademy.com.bd',
  SMTP_HOST: 'smtp.resend.com',
  SMTP_PORT: '465',
  SMTP_USER: 'resend',
  SMTP_PASS: 're_test',
} as NodeJS.ProcessEnv;

const RESET_URL = 'https://youracademy.com.bd/reset-password?token=abc123';

describe('password reset email', () => {
  const config = loadEmailConfig(prodEnv);
  const email = passwordResetEmail(config.brand, { resetUrl: RESET_URL, expiresInMinutes: 30 });

  it('has a plain, non-spammy subject', () => {
    assert.equal(email.subject, 'Reset your Your Academy password');
    assert.doesNotMatch(email.subject, /!|urgent|free/i);
    assert.doesNotMatch(email.subject, /[A-Z]{4,}/); // no ALL CAPS words
  });

  it('ships both HTML and plain text with the link and expiry', () => {
    for (const part of [email.html, email.text]) {
      assert.ok(part.includes(RESET_URL.replace(/&/g, '&amp;')) || part.includes(RESET_URL));
      assert.match(part, /30 minutes/);
      assert.match(part, /ignore this email/);
    }
  });

  it('only links to our own https domain (no IPs, localhost, or shorteners)', () => {
    const urls = [...email.html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(urls.length >= 4);
    for (const url of urls) {
      assert.match(
        url,
        /^(https:\/\/youracademy\.com\.bd(\/|$)|mailto:support@youracademy\.com\.bd$)/,
        url,
      );
    }
  });

  it('uses the logo on our domain with alt text and no scripts', () => {
    assert.match(
      email.html,
      /src="https:\/\/youracademy\.com\.bd\/images\/email-logo\.png"[^>]*alt="Your Academy"/,
    );
    assert.doesNotMatch(email.html, /<script/i);
  });

  it('escapes HTML in dynamic values', () => {
    const evil = passwordResetEmail(config.brand, {
      resetUrl: 'https://youracademy.com.bd/reset-password?token=x"><script>alert(1)</script>',
      expiresInMinutes: 30,
    });
    assert.doesNotMatch(evil.html, /<script>alert/);
  });
});

describe('email verification email', () => {
  it('reuses the same layout', () => {
    const config = loadEmailConfig(prodEnv);
    const email = emailVerificationEmail(config.brand, {
      verifyUrl: 'https://youracademy.com.bd/verify-email?token=t',
      expiresInMinutes: 1440,
    });
    assert.equal(email.subject, 'Confirm your email for Your Academy');
    assert.match(email.text, /24 hours/);
    assert.match(email.html, /Confirm Email/);
    assert.match(email.html, /email-logo\.png/);
  });
});

describe('config + sending', () => {
  it('warns when sending from a free-mail domain', () => {
    const config = loadEmailConfig({
      ...prodEnv,
      EMAIL_FROM: 'Your Academy <youracademy04@gmail.com>',
    });
    assert.ok(emailConfigWarnings(config, true).some((w) => w.includes('gmail.com')));
    assert.deepEqual(emailConfigWarnings(loadEmailConfig(prodEnv), true), []);
  });

  it('uses SSL on port 465 and Reply-To as the support contact', () => {
    const config = loadEmailConfig(prodEnv);
    assert.equal(config.secure, true);
    assert.equal(config.fromDomain, 'youracademy.com.bd');
    assert.equal(config.brand.supportEmail, 'support@youracademy.com.bd');
  });

  it('masks recipients in logs', () => {
    assert.equal(maskEmail('someone@gmail.com'), 'so***@gmail.com');
  });

  it('refuses to log links in production when SMTP is missing', async () => {
    const config = loadEmailConfig({ ...prodEnv, SMTP_HOST: '' });
    const logs: string[] = [];
    const send = createEmailSender(config, { isProduction: true, log: (m) => logs.push(m) });
    const email = passwordResetEmail(config.brand, { resetUrl: RESET_URL, expiresInMinutes: 30 });
    await assert.rejects(send('password-reset', 'a@b.com', email, RESET_URL));
    assert.ok(logs.every((l) => !l.includes('token=')));
  });

  it('logs the link only in development, with a Message-ID on the From domain', async () => {
    const config = loadEmailConfig({ ...prodEnv, NODE_ENV: 'development', SMTP_HOST: '' });
    const logs: string[] = [];
    const send = createEmailSender(config, { isProduction: false, log: (m) => logs.push(m) });
    const email = passwordResetEmail(config.brand, { resetUrl: RESET_URL, expiresInMinutes: 30 });
    const out = await send('password-reset', 'someone@gmail.com', email, RESET_URL);
    assert.equal(out.status, 'logged');
    assert.match(out.messageId, /@youracademy\.com\.bd>$/);
    assert.ok(logs[0].includes('so***@gmail.com'));
  });
});

describe('email changed notice', () => {
  it('renders without a button or link and masks the new address', () => {
    const brand = {
      name: 'Your Academy',
      siteUrl: 'https://youracademy.com.bd',
      logoUrl: 'x',
      supportEmail: 'support@youracademy.com.bd',
    };
    const email = emailChangedNoticeEmail(brand, {
      newEmailMasked: 'so***@gmail.com',
      changedBy: 'admin',
    });
    assert.match(email.subject, /email address was changed/);
    assert.match(email.text, /so\*\*\*@gmail\.com/);
    assert.doesNotMatch(email.html, /Button not working/);
  });
});

describe('subscription reminder email (DEC-062)', () => {
  const config = loadEmailConfig(prodEnv);
  const base = {
    name: 'Rahim',
    daysLeft: 7,
    endsAt: '2026-12-02T10:00:00.000Z',
    planName: '6 Months',
    renewal: { planName: '6 Months', amountBdt: '1499.00' },
    cancelled: false,
    manageUrl: 'https://youracademy.com.bd/billing',
  };

  it('7-day: date, renewal price, renew link, never claims an automatic charge', () => {
    const email = subscriptionReminderEmail(config.brand, { ...base, window: 7 });
    assert.match(email.subject, /2 December 2026/);
    for (const part of [email.html, email.text]) {
      assert.ok(part.includes('https://youracademy.com.bd/billing'));
      assert.match(part, /BDT 1,499/);
      assert.match(part, /never charged automatically/);
    }
    assert.doesNotMatch(email.subject, /!|urgent|free/i);
  });

  it('3-day + cancelled: says renewal is off, no price pitch', () => {
    const email = subscriptionReminderEmail(config.brand, {
      ...base,
      window: 3,
      daysLeft: 3,
      cancelled: true,
    });
    assert.match(email.subject, /ends in 3 days/);
    assert.match(email.text, /turned off renewal/);
    assert.doesNotMatch(email.text, /BDT 1,499/);
  });
});
