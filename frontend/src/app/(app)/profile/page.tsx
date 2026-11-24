'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Clock3, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MetricTile } from '@/components/dashboard/metric-tile';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { UserAvatar } from '@/components/layout/user-avatar';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { isUnauthorized, meQueryKey, useLogout, useMe } from '@/features/auth/use-auth';
import { MyPlanCard } from '@/features/billing/my-plan-card';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser, UserStats } from '@/lib/api/types';
import { getStorageStatus, uploadViaSignedRequest } from '@/lib/cloudinary-upload';
import { formatStudyMinutes } from '@/lib/study-prefs';
import { ProfilePageSkeleton } from '@/components/skeletons';

function formatJoined(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ProfilePage() {
  const me = useMe();
  const logout = useLogout();
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch<UserStats>('/users/me/stats'),
    enabled: Boolean(me.data),
  });
  const storage = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
    enabled: Boolean(me.data),
  });

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  useEffect(() => {
    if (me.data) {
      setName(me.data.name);
      setEmail(me.data.email ?? '');
    }
  }, [me.data]);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch<MeUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          email: email.trim() ? email.trim() : null,
        }),
      }),
    onSuccess: (user) => {
      qc.setQueryData(meQueryKey, user);
      setProfileMsg('Profile saved.');
      setProfileErr(null);
    },
    onError: (err) => {
      setProfileMsg(null);
      setProfileErr(err instanceof ApiError ? err.message : 'Update failed');
    },
  });

  const changePassword = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) {
        return Promise.reject(new ApiError('VALIDATION', 'New passwords do not match', 400));
      }
      if (newPassword.length < 8) {
        return Promise.reject(
          new ApiError('VALIDATION', 'New password must be at least 8 characters', 400),
        );
      }
      if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return Promise.reject(
          new ApiError('VALIDATION', 'New password must include a letter and a number', 400),
        );
      }
      return apiFetch<{ user: MeUser }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
    onSuccess: (result) => {
      qc.setQueryData(meQueryKey, result.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('Password updated.');
      setPasswordErr(null);
    },
    onError: (err) => {
      setPasswordMsg(null);
      setPasswordErr(err instanceof ApiError ? err.message : 'Password change failed');
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const media = await uploadViaSignedRequest('avatar', file);
      return apiFetch<MeUser>('/users/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ mediaAssetId: media.id }),
      });
    },
    onSuccess: (user) => {
      qc.setQueryData(meQueryKey, user);
      setAvatarMsg('Avatar updated.');
      setAvatarErr(null);
    },
    onError: (err) => {
      setAvatarMsg(null);
      setAvatarErr(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Avatar upload failed',
      );
    },
  });

  if (me.isLoading) {
    return <ProfilePageSkeleton />;
  }

  if (isUnauthorized(me.error) || !me.data) {
    return (
      <Alert variant="warning">
        Sign in to view profile.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  const user = me.data;
  const joined = formatJoined(user.createdAt);

  return (
    <LearnerPage>
      <PageHeader
        eyebrow="Main"
        title="My Profile"
        description="Account details, profile photo, and password security."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Link href="/home" className="min-w-0">
              <Button variant="soft" size="sm" className="w-full sm:w-auto">
                Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={logout.isPending}
              onClick={() => setLogoutOpen(true)}
            >
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        }
      />

      <ConfirmDialog
        open={logoutOpen}
        title="Sign out?"
        description="You will need to sign in again to access your dashboard, bookmarks, and practice tools."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        destructive
        reversible
        pending={logout.isPending}
        onCancel={() => {
          if (!logout.isPending) setLogoutOpen(false);
        }}
        onConfirm={() => logout.mutate()}
      />

      <Surface elevated className="overflow-x-clip p-3.5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="size-16 shrink-0 ring-2 sm:size-[4.5rem]"
            />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                  {user.name}
                </h2>
                <Badge variant={user.access.isPaid ? 'success' : 'outline'}>
                  {user.access.isPaid ? 'Paid' : 'Free'}
                </Badge>
              </div>
              <dl className="grid gap-1.5 text-sm text-[var(--muted-strong)]">
                <div className="flex min-w-0 flex-wrap gap-x-2">
                  <dt className="font-medium text-[var(--muted)]">WhatsApp</dt>
                  <dd className="break-all text-[var(--ink-soft)]">{user.whatsappNumber}</dd>
                </div>
                <div className="flex min-w-0 flex-wrap gap-x-2">
                  <dt className="font-medium text-[var(--muted)]">Email</dt>
                  <dd className="break-all text-[var(--ink-soft)]">
                    {user.email?.trim() ? user.email : 'Not set'}
                  </dd>
                </div>
                {joined ? (
                  <div className="flex min-w-0 flex-wrap gap-x-2">
                    <dt className="font-medium text-[var(--muted)]">Joined</dt>
                    <dd className="text-[var(--ink-soft)]">{joined}</dd>
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-wrap gap-x-2">
                  <dt className="font-medium text-[var(--muted)]">Account</dt>
                  <dd className="text-[var(--ink-soft)]">
                    {user.status}
                    <span className="mx-1.5 text-[var(--line-strong)]">·</span>
                    {user.role === 'USER' ? 'Learner' : user.role}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </Surface>

      <MyPlanCard />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Study summary</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            label="Saved questions"
            value={stats.data?.questionBookmarks ?? 0}
            icon={BookMarked}
            tone="navy"
          />
          <MetricTile
            label="Saved PDFs"
            value={stats.data?.documentBookmarks ?? 0}
            icon={FileText}
            tone="blue"
          />
          <MetricTile
            label="Study time"
            value={formatStudyMinutes(stats.data?.browsingSeconds ?? 0)}
            icon={Clock3}
            tone="green"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/bookmarks"
            className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
          >
            Open saved items
          </Link>
          <Link
            href="/results"
            className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
          >
            Exam history
          </Link>
        </div>
      </section>

      {stats.data &&
      (stats.data.recentQuestions.length > 0 || stats.data.recentDocuments.length > 0) ? (
        <Surface elevated className="space-y-5 overflow-x-clip p-3.5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">Recent saves</h2>
            <Link
              href="/bookmarks"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              All bookmarks
            </Link>
          </div>
          {stats.data.recentQuestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
                Questions
              </p>
              <ul className="divide-y divide-[var(--line)]">
                {stats.data.recentQuestions.map((item) => (
                  <li key={item.bookmarkId}>
                    <Link
                      href={`/questions/${item.id}`}
                      className="block break-words py-2.5 text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {stats.data.recentDocuments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
                PDFs
              </p>
              <ul className="divide-y divide-[var(--line)]">
                {stats.data.recentDocuments.map((item) => (
                  <li key={item.bookmarkId}>
                    <Link
                      href={`/documents/${item.id}`}
                      className="block break-words py-2.5 text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Surface>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface elevated className="overflow-x-clip p-3.5 sm:p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Edit profile</h2>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            WhatsApp login stays fixed. Add an email if you want password-reset links.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setProfileMsg(null);
              setProfileErr(null);
              if (name.trim().length < 2) {
                setProfileErr('Display name must be at least 2 characters.');
                return;
              }
              saveProfile.mutate();
            }}
          >
            <Field>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
              />
            </Field>
            <Field>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Needed for password reset"
                autoComplete="email"
              />
            </Field>
            <Field>
              <Label htmlFor="whatsapp-readonly">Phone (WhatsApp)</Label>
              <Input
                id="whatsapp-readonly"
                value={user.whatsappNumber}
                readOnly
                disabled
                aria-describedby="whatsapp-hint"
              />
              <p id="whatsapp-hint" className="mt-1.5 text-xs text-[var(--muted)]">
                Login identity cannot be changed here.
              </p>
            </Field>

            <div className="space-y-3 border-t border-[var(--line)] pt-5">
              <h3 className="font-display text-base font-semibold tracking-tight">Profile photo</h3>
              {storage.data && !storage.data.configured ? (
                <Alert variant="info">
                  Cloudinary is not configured — avatar upload stays disabled until storage
                  credentials are set.
                </Alert>
              ) : (
                <>
                  <Label htmlFor="avatar">Upload JPEG, PNG, or WebP</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadAvatar.isPending || storage.isLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar.mutate(file);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
              {avatarMsg ? <Alert variant="success">{avatarMsg}</Alert> : null}
              {avatarErr ? <Alert variant="danger">{avatarErr}</Alert> : null}
              {uploadAvatar.isPending ? (
                <p className="text-sm text-[var(--muted-strong)]">Uploading…</p>
              ) : null}
            </div>

            {profileMsg ? <Alert variant="success">{profileMsg}</Alert> : null}
            {profileErr ? <Alert variant="danger">{profileErr}</Alert> : null}
            <Button type="submit" className="min-h-10" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Surface>

        <Surface elevated className="overflow-x-clip p-3.5 sm:p-6">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--info-soft)] text-[var(--info)]">
              <ShieldCheck className="size-4" aria-hidden strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight">Change password</h2>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">
                At least 8 characters with a letter and a number. You stay signed in after a
                successful change.
              </p>
            </div>
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordMsg(null);
              setPasswordErr(null);
              changePassword.mutate();
            }}
          >
            <Field>
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field>
              <Label htmlFor="next">New password</Label>
              <Input
                id="next"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            {passwordMsg ? <Alert variant="success">{passwordMsg}</Alert> : null}
            {passwordErr ? <Alert variant="danger">{passwordErr}</Alert> : null}
            <Button
              type="submit"
              variant="secondary"
              className="min-h-10"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </Surface>
      </div>
    </LearnerPage>
  );
}
