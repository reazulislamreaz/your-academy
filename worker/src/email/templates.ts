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
  const who = input.changedBy === 'admin' ? 'by our support team at your request' : 'from your account settings';
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
