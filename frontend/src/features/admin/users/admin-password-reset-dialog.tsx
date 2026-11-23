'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Mail, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/features/auth/password-field';
import { ApiError, apiFetch } from '@/lib/api/client';
import { isValidPassword, PASSWORD_POLICY_HINT } from '@/lib/auth/password-policy';
import { whatsappLink } from '@/lib/support-whatsapp';
import { cn } from '@/lib/utils';

export type ResetTargetUser = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
};

type Option = 'email' | 'whatsapp' | 'temporary';

type Outcome =
  | { kind: 'email'; email: string; expiresAt: string }
  | { kind: 'whatsapp'; resetUrl: string; expiresAt: string }
  | { kind: 'temporary'; temporaryPassword: string | null };

const OPTIONS: { value: Option; label: string; icon: typeof Mail }[] = [
  { value: 'email', label: 'Email link', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp link', icon: MessageCircle },
  { value: 'temporary', label: 'Temporary password', icon: KeyRound },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function whatsappMessage(name: string, url: string, expiresAt: string): string {
  const until = timeLabel(expiresAt);
  return [
    `Hello ${name}, this is Your Academy support.`,
    `Use this link to set a new password (valid once, until ${until}):`,
    url,
    '',
    `আসসালামু আলাইকুম ${name}, Your Academy সাপোর্ট থেকে বলছি।`,
    `নতুন পাসওয়ার্ড সেট করতে এই লিংকটি ব্যবহার করুন (একবারই কাজ করবে, ${until} পর্যন্ত):`,
    url,
  ].join('\n');
}

/** "Reset password" action for the admin user list and detail page (Admin-only feature). */
export function AdminPasswordResetButton({
  user,
  currentUserId,
  className,
}: {
  user: ResetTargetUser;
  currentUserId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Admin accounts and your own account are refused by the API; hide the dead end.
  if (user.role === 'ADMIN' || user.id === currentUserId) return null;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className={cn('gap-1.5', className)}>
        <KeyRound className="size-3.5" aria-hidden />
        Reset password
      </Button>
      {open ? <AdminPasswordResetDialog user={user} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AdminPasswordResetDialog({ user, onClose }: { user: ResetTargetUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [option, setOption] = useState<Option>('email');
  const [email, setEmail] = useState(user.email ?? '');
  const [typedPassword, setTypedPassword] = useState('');
  const [typeOwn, setTypeOwn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const emailTrimmed = email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(emailTrimmed);
  const emailChanged = Boolean(user.email) && emailTrimmed !== user.email;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-users'] });
    void qc.invalidateQueries({ queryKey: ['admin-user', user.id] });
    void qc.invalidateQueries({ queryKey: ['admin-user-reset-history', user.id] });
    void qc.invalidateQueries({ queryKey: ['admin-user-logins', user.id] });
  };

  const run = useMutation({
    mutationFn: async (): Promise<Outcome> => {
      const base = `/admin/users/${user.id}/password-reset`;
      if (option === 'email') {
        const res = await apiFetch<{ email: string; expiresAt: string }>(`${base}/email`, {
          method: 'POST',
          body: JSON.stringify({ email: emailTrimmed }),
        });
        return { kind: 'email', ...res };
      }
      if (option === 'whatsapp') {
        const res = await apiFetch<{ resetUrl: string; expiresAt: string }>(`${base}/link`, {
          method: 'POST',
        });
        return { kind: 'whatsapp', resetUrl: res.resetUrl, expiresAt: res.expiresAt };
      }
      const res = await apiFetch<{ temporaryPassword: string | null }>(`${base}/temporary`, {
        method: 'POST',
        body: JSON.stringify(typeOwn ? { password: typedPassword } : {}),
      });
      return { kind: 'temporary', temporaryPassword: res.temporaryPassword };
    },
    onSuccess: (result) => {
      setError(null);
      setOutcome(result);
      refresh();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.'),
  });

  const disableSubmit =
    !outcome &&
    ((option === 'email' && !emailValid) || (option === 'temporary' && typeOwn && !isValidPassword(typedPassword)));

  const confirmLabel = outcome
    ? 'Done'
    : option === 'email'
      ? 'Send reset email'
      : option === 'whatsapp'
        ? 'Create link'
        : 'Set temporary password';

  return (
    <FormDialog
      open
      title={`Reset password for ${user.name}`}
      description="Only Admins can do this. Every action is recorded in the audit log."
      confirmLabel={confirmLabel}
      pending={run.isPending}
      error={error}
      disableSubmit={disableSubmit}
      onSubmit={() => (outcome ? onClose() : run.mutate())}
      onClose={onClose}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)]/50 px-3 py-2.5 text-sm">
        <dt className="text-[var(--muted-strong)]">Name</dt>
        <dd className="font-medium text-[var(--ink)]">{user.name}</dd>
        <dt className="text-[var(--muted-strong)]">WhatsApp</dt>
        <dd className="font-medium tabular-nums text-[var(--ink)]">{user.whatsappNumber}</dd>
        <dt className="text-[var(--muted-strong)]">Email</dt>
        <dd className="break-all font-medium text-[var(--ink)]">{user.email ?? 'None'}</dd>
      </dl>

      {outcome ? (
        <OutcomePanel outcome={outcome} user={user} />
      ) : (
        <>
          <div role="radiogroup" aria-label="Reset method" className="grid gap-2 sm:grid-cols-3">
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={option === value}
                onClick={() => {
                  setOption(value);
                  setError(null);
                }}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-[var(--radius)] border px-3 text-left text-sm font-medium transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--highlight)]',
                  option === value
                    ? 'border-[var(--highlight)] bg-[var(--highlight)]/10 text-[var(--ink)]'
                    : 'border-[var(--line)] text-[var(--muted-strong)] hover:border-[var(--line-strong)]',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {option === 'email' ? (
            <Field>
              <Label htmlFor="reset-email">{user.email ? 'Send to this email' : 'Add an email for this user'}</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={email.length > 0 && !emailValid}
                autoComplete="off"
                placeholder="name@example.com"
              />
              <FieldHint className="text-xs">
                {emailChanged
                  ? `Replaces ${user.email}. The old address gets a short notice.`
                  : user.email
                    ? 'Keep it or type a different address.'
                    : 'It is saved to the account and marked verified once they use the link.'}
              </FieldHint>
              {email.length > 0 && !emailValid ? (
                <FieldHint className="text-xs text-[var(--danger-fg)]">Enter a valid email address.</FieldHint>
              ) : null}
            </Field>
          ) : null}

          {option === 'whatsapp' ? (
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
              Creates a one-time reset link for {user.name}. You can copy it or open WhatsApp with a ready-made
              message. Creating a new link cancels any older one.
            </p>
          ) : null}

          {option === 'temporary' ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
                {user.name} is signed out of every device and must choose a new password the next time they sign
                in.
              </p>
              <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                <input type="checkbox" checked={typeOwn} onChange={(e) => setTypeOwn(e.target.checked)} />
                Type my own instead of generating one
              </label>
              {typeOwn ? (
                <Field>
                  <Label htmlFor="temp-password">Temporary password</Label>
                  <PasswordField
                    id="temp-password"
                    value={typedPassword}
                    onChange={(e) => setTypedPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <FieldHint className="text-xs">{PASSWORD_POLICY_HINT}</FieldHint>
                </Field>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </FormDialog>
  );
}

function OutcomePanel({ outcome, user }: { outcome: Outcome; user: ResetTargetUser }) {
  if (outcome.kind === 'email') {
    return (
      <Alert variant="success">
        Reset email sent to {outcome.email}. The link works once and expires at {timeLabel(outcome.expiresAt)}.
      </Alert>
    );
  }
  if (outcome.kind === 'whatsapp') {
    const wa = whatsappLink(whatsappMessage(user.name, outcome.resetUrl, outcome.expiresAt), user.whatsappNumber);
    return (
      <div className="space-y-3">
        <Alert variant="success">
          Reset link created. It works once and expires at {timeLabel(outcome.expiresAt)}.
        </Alert>
        <Field>
          <Label htmlFor="reset-link">Reset link</Label>
          <Input id="reset-link" readOnly value={outcome.resetUrl} onFocus={(e) => e.currentTarget.select()} />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CopyButton value={outcome.resetUrl} label="Copy link" copiedLabel="Reset link copied" />
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[#25D366] px-4 text-sm font-semibold text-[#0b2e1a] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
            >
              <MessageCircle className="size-4" aria-hidden />
              Open in WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Alert variant="success">
        Temporary password set. {user.name} has been signed out everywhere and must choose a new password at
        next sign-in.
      </Alert>
      {outcome.temporaryPassword ? (
        <>
          <Field>
            <Label htmlFor="temp-result">Temporary password (shown once)</Label>
            <Input id="temp-result" readOnly value={outcome.temporaryPassword} className="font-mono tracking-wide" />
          </Field>
          <CopyButton value={outcome.temporaryPassword} label="Copy password" copiedLabel="Password copied" />
        </>
      ) : null}
    </div>
  );
}

function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setFailed(false);
        } catch {
          setFailed(true);
        }
      }}
      className="gap-2"
      aria-live="polite"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {failed ? 'Copy failed — select and copy manually' : copied ? copiedLabel : label}
    </Button>
  );
}
