import { renderEmail, type EmailBrand, type RenderedEmail } from './layout';

export type TemplateEmail = RenderedEmail & { subject: string };

function minutesLabel(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 120) return `${minutes / 60} hours`;
  if (minutes === 60) return '1 hour';
  return `${minutes} minutes`;
}

/** Subject and copy stay plain and specific — no caps, urgency words, or "free". */
export function passwordResetEmail(
  brand: EmailBrand,
  input: { resetUrl: string; expiresInMinutes: number },
): TemplateEmail {
  const expiry = minutesLabel(input.expiresInMinutes);
  return {
    subject: `Reset your ${brand.name} password`,
    ...renderEmail(
      {
        preheader: `Use this link to choose a new password. It expires in ${expiry}.`,
        heading: 'Reset your password',
        paragraphs: [
          'We received a request to reset the password for your account.',
          'Click the button below to choose a new password.',
        ],
        button: { label: 'Reset Password', url: input.resetUrl },
        notes: [
          `This link expires in ${expiry} and can be used once.`,
          "If you didn't request a password reset, you can safely ignore this email. Your password won't change.",
        ],
      },
      brand,
    ),
  };
}

export function emailVerificationEmail(
  brand: EmailBrand,
  input: { verifyUrl: string; expiresInMinutes: number },
): TemplateEmail {
  const expiry = minutesLabel(input.expiresInMinutes);
  return {
    subject: `Confirm your email for ${brand.name}`,
    ...renderEmail(
      {
        preheader: 'Confirm this address so you can receive password reset links.',
        heading: 'Confirm your email',
        paragraphs: [
          'Please confirm that this email address belongs to you.',
          'Once confirmed, we can send password reset links here if you ever need them.',
        ],
        button: { label: 'Confirm Email', url: input.verifyUrl },
        notes: [
          `This link expires in ${expiry}.`,
          "If you didn't add this email to an account, you can ignore this message.",
        ],
      },
      brand,
    ),
  };
}

/** Security notice to the previous address after an account's email is replaced. No links. */
export function emailChangedNoticeEmail(
  brand: EmailBrand,
  input: { newEmailMasked: string; changedBy: 'admin' | 'user' },
): TemplateEmail {
  const who =
    input.changedBy === 'admin'
      ? 'by our support team at your request'
      : 'from your account settings';
  return {
    subject: `Your ${brand.name} email address was changed`,
    ...renderEmail(
      {
        preheader: `The email on your account is now ${input.newEmailMasked}.`,
        heading: 'Your email address was changed',
        paragraphs: [
          `The email address on your ${brand.name} account was changed ${who}.`,
          `New address: ${input.newEmailMasked}. Future emails, including password reset links, will go there.`,
        ],
        notes: [
          brand.supportEmail
            ? `If you didn't ask for this change, contact us right away at ${brand.supportEmail}.`
            : "If you didn't ask for this change, contact our support team right away.",
        ],
      },
      brand,
    ),
  };
}

export type SubscriptionReminderInput = {
  name: string;
  window: 7 | 3;
  daysLeft: number;
  /** ISO date-time. */
  endsAt: string;
  planName: string | null;
  renewal: { planName: string; amountBdt: string } | null;
  cancelled: boolean;
  manageUrl: string;
};

/** Dhaka calendar date, e.g. "2 December 2026" (all learners are in Bangladesh). */
function formatDhakaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(iso));
}

function formatTaka(amount: string): string {
  const n = Number(amount);
  return `BDT ${Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * DEC-062 — 7- / 3-day reminder before a plan ends. There is no automatic charge (SSLCommerz
 * recurring is not enabled), so the copy always says access ends unless the learner renews.
 */
export function subscriptionReminderEmail(
  brand: EmailBrand,
  input: SubscriptionReminderInput,
): TemplateEmail {
  const date = formatDhakaDate(input.endsAt);
  const days = `${input.daysLeft} ${input.daysLeft === 1 ? 'day' : 'days'}`;
  const plan = input.planName ? `${input.planName} plan` : 'plan';
  const paragraphs = [
    `Hi ${input.name},`,
    `Your ${brand.name} ${plan} ends on ${date} (in ${days}). After that, paid question sets and Model Tests will be locked again.`,
  ];
  if (input.cancelled) {
    paragraphs.push(
      "You turned off renewal, so we won't ask again after this. If you change your mind, you can renew any time before the end date.",
    );
  } else if (input.renewal) {
    paragraphs.push(
      `To keep full access, renew with ${input.renewal.planName} for ${formatTaka(input.renewal.amountBdt)}. The new period is added after ${date}, so you don't lose any days.`,
    );
  } else {
    paragraphs.push(
      'To keep full access, choose a plan and renew. The new period is added after your current end date.',
    );
  }
  return {
    subject:
      input.window === 3
        ? `Your ${brand.name} plan ends in ${days}`
        : `Reminder: your ${brand.name} plan ends on ${date}`,
    ...renderEmail(
      {
        preheader: `Your plan ends on ${date}. Renew to keep full access.`,
        heading: input.window === 3 ? `Your plan ends in ${days}` : 'Your plan ends soon',
        paragraphs,
        button: { label: 'Renew now', url: input.manageUrl },
        notes: [
          'You are never charged automatically: nothing happens unless you choose to renew.',
          'You can also cancel renewal or switch plans from the same page.',
        ],
      },
      brand,
    ),
  };
}
