'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyRound, PencilLine, ShieldCheck } from 'lucide-react';
import { isValidWhatsapp, normalizeWhatsapp, ROLE_LABELS, UserRole } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { PasswordField } from '@/features/auth/password-field';
import { ApiError, apiFetch } from '@/lib/api/client';
import { isValidPassword, PASSWORD_POLICY_HINT } from '@/lib/auth/password-policy';

/** Roles an Admin may assign to dashboard accounts (DEC-048). */
type StaffRole = 'ADMIN' | 'MODERATOR';

export type StaffUserRow = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
};

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin-users'] });
    void qc.invalidateQueries({ queryKey: ['admin-user'] });
  };
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function RoleSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: StaffRole;
  onChange: (role: StaffRole) => void;
}) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value as StaffRole)} className="h-10 w-full">
      <option value="MODERATOR">{ROLE_LABELS[UserRole.MODERATOR]} — content sections only</option>
      <option value="ADMIN">{ROLE_LABELS[UserRole.ADMIN]} — full access</option>
    </Select>
  );
}

export function CreateStaffUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invalidate = useInvalidateUsers();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('MODERATOR');
  const [error, setError] = useState<string | null>(null);

  const whatsappOk = isValidWhatsapp(normalizeWhatsapp(whatsapp));
  const valid = name.trim().length >= 2 && whatsappOk && isValidPassword(password);

  const reset = () => {
    setName('');
    setWhatsapp('');
    setPassword('');
    setRole('MODERATOR');
    setError(null);
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          whatsappNumber: normalizeWhatsapp(whatsapp),
          password,
          role,
        }),
      }),
    onSuccess: () => {
      invalidate();
      reset();
      onClose();
    },
    onError: (err) => setError(errorMessage(err, 'Could not create the account')),
  });

  return (
    <FormDialog
      open={open}
      title="Create dashboard account"
      description="The person signs in at /login with this WhatsApp number and password. Share the password with them securely."
      confirmLabel="Create account"
      pending={create.isPending}
      error={error}
      disableSubmit={!valid}
      onSubmit={() => create.mutate()}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <div className="space-y-4">
        <Field>
          <Label htmlFor="staff-name">Full name</Label>
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />
        </Field>
        <Field>
          <Label htmlFor="staff-whatsapp">WhatsApp number</Label>
          <Input
            id="staff-whatsapp"
            type="tel"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="01XXXXXXXXX"
            aria-invalid={whatsapp.length > 0 && !whatsappOk}
            aria-describedby="staff-whatsapp-hint"
            required
          />
          <FieldHint className="text-xs">
            <span id="staff-whatsapp-hint">
              {whatsapp && whatsappOk
                ? `Saved as ${normalizeWhatsapp(whatsapp)}`
                : 'Bangladeshi mobile, saved as +8801XXXXXXXXX.'}
            </span>
          </FieldHint>
        </Field>
        <Field>
          <Label htmlFor="staff-password">Temporary password</Label>
          <PasswordField
            id="staff-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-describedby="staff-password-hint"
            required
          />
          <FieldHint className="text-xs">
            <span id="staff-password-hint">{PASSWORD_POLICY_HINT}</span>
          </FieldHint>
        </Field>
        <Field>
          <Label htmlFor="staff-role">Role</Label>
          <RoleSelect id="staff-role" value={role} onChange={setRole} />
        </Field>
      </div>
    </FormDialog>
  );
}

type DialogKind = 'edit' | 'role' | 'password' | null;

/**
 * Row actions for staff accounts. The API enforces every rule (no self role change,
 * last admin protected, moderator-only password reset); the UI just hides dead ends.
 */
export function StaffUserActions({ user, currentUserId }: { user: StaffUserRow; currentUserId?: string }) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const isSelf = user.id === currentUserId;
  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') return null;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setDialog('edit')} className="gap-1.5">
        <PencilLine className="size-3.5" aria-hidden />
        Edit
      </Button>
      {!isSelf ? (
        <Button size="sm" variant="ghost" onClick={() => setDialog('role')} className="gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden />
          Role
        </Button>
      ) : null}
      {user.role === 'MODERATOR' && !isSelf ? (
        <Button size="sm" variant="ghost" onClick={() => setDialog('password')} className="gap-1.5">
          <KeyRound className="size-3.5" aria-hidden />
          Reset password
        </Button>
      ) : null}

      {dialog === 'edit' ? <EditStaffDialog user={user} onClose={() => setDialog(null)} /> : null}
      {dialog === 'role' ? <ChangeRoleDialog user={user} onClose={() => setDialog(null)} /> : null}
      {dialog === 'password' ? <ResetPasswordDialog user={user} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

function EditStaffDialog({ user, onClose }: { user: StaffUserRow; onClose: () => void }) {
  const invalidate = useInvalidateUsers();
  const [name, setName] = useState(user.name);
  const [whatsapp, setWhatsapp] = useState(user.whatsappNumber);
  const [email, setEmail] = useState(user.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const whatsappOk = isValidWhatsapp(normalizeWhatsapp(whatsapp));

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          whatsappNumber: normalizeWhatsapp(whatsapp),
          email: email.trim() || null,
        }),
      }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setError(errorMessage(err, 'Could not save changes')),
  });

  return (
    <FormDialog
      open
      title={`Edit ${user.name}`}
      description="A changed email becomes unverified until its owner confirms it from Account Settings."
      pending={save.isPending}
      error={error}
      disableSubmit={name.trim().length < 2 || !whatsappOk}
      onSubmit={() => save.mutate()}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field>
          <Label htmlFor="edit-name">Full name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <Label htmlFor="edit-whatsapp">WhatsApp number</Label>
          <Input
            id="edit-whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            aria-invalid={!whatsappOk}
            required
          />
        </Field>
        <Field>
          <Label htmlFor="edit-email">Email (optional)</Label>
          <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
}

function ChangeRoleDialog({ user, onClose }: { user: StaffUserRow; onClose: () => void }) {
  const invalidate = useInvalidateUsers();
  const [role, setRole] = useState<StaffRole>(user.role === 'ADMIN' ? 'ADMIN' : 'MODERATOR');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (err) => setError(errorMessage(err, 'Could not change the role')),
  });

  return (
    <FormDialog
      open
      title={`Change role for ${user.name}`}
      description="Takes effect on their next request. The last active Admin cannot be demoted."
      confirmLabel="Change role"
      pending={save.isPending}
      error={error}
      disableSubmit={role === user.role}
      onSubmit={() => save.mutate()}
      onClose={onClose}
    >
      <Field>
        <Label htmlFor="role-select">Role</Label>
        <RoleSelect id="role-select" value={role} onChange={setRole} />
      </Field>
    </FormDialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: StaffUserRow; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  const reset = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: password }),
      }),
    onSuccess: () => setDone(true),
    onError: (err) => setError(errorMessage(err, 'Could not reset the password')),
  });

  return (
    <FormDialog
      open
      title={done ? 'Password reset' : `Reset password for ${user.name}`}
      description={
        done
          ? `${user.name} has been signed out everywhere. Share the new password with them securely.`
          : 'Use this when the moderator has no verified email. They are signed out of all devices.'
      }
      confirmLabel={done ? 'Done' : 'Reset password'}
      pending={reset.isPending}
      error={error}
      disableSubmit={!done && (!isValidPassword(password) || password !== confirm)}
      onSubmit={() => (done ? onClose() : reset.mutate())}
      onClose={onClose}
    >
      {done ? null : (
        <div className="space-y-4">
          <Field>
            <Label htmlFor="reset-new">New password</Label>
            <PasswordField
              id="reset-new"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <FieldHint className="text-xs">{PASSWORD_POLICY_HINT}</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="reset-confirm">Confirm new password</Label>
            <PasswordField
              id="reset-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-invalid={mismatch}
              required
            />
            {mismatch ? <FieldHint className="text-xs text-[var(--highlight)]">Passwords do not match.</FieldHint> : null}
          </Field>
        </div>
      )}
    </FormDialog>
  );
}
