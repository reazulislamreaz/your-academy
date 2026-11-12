'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Clock3, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MetricTile } from '@/components/dashboard/metric-tile';
import { PageHeader } from '@/components/layout/page-header';
import { UserAvatar } from '@/components/layout/user-avatar';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { TrialCountdown } from '@/features/auth/trial-countdown';
import { isUnauthorized, meQueryKey, useLogout, useMe } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser, UserStats } from '@/lib/api/types';
import { getStorageStatus, uploadViaSignedRequest } from '@/lib/cloudinary-upload';
import { formatStudyMinutes } from '@/lib/study-prefs';
import { ProfilePageSkeleton } from '@/components/skeletons';

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

  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Profile & settings"
        description="Membership, study summary, and account controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/home">
              <Button variant="soft" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        }
      />

      <Surface elevated className="space-y-4 border-l-[3px] border-l-[var(--highlight)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="size-14 ring-2"
            />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
                {user.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">
                {user.whatsappNumber}
                {user.email ? ` · ${user.email}` : ''}
              </p>
            </div>
          </div>
          <TrialCountdown
            trialEndsAt={user.access.trialEndsAt}
            isTrialActive={user.access.isTrialActive}
          />
        </div>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          {user.access.isTrialActive
            ? 'Answers and explanations are unlocked for the rest of your trial.'
            : 'You can still browse and bookmark. Correct answers stay premium after trial.'}
        </p>
        {user.access.hasActiveSubscription ? (
          <Alert variant="success">Active membership entitlements are on for this account.</Alert>
        ) : null}
      </Surface>

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
            href="/home#exam-history"
            className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
          >
            Recent answer checks
          </Link>
        </div>
      </section>

      {stats.data &&
      (stats.data.recentQuestions.length > 0 || stats.data.recentDocuments.length > 0) ? (
        <Surface elevated className="space-y-5 p-5 sm:p-6">
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
                      className="block py-2.5 text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
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
                      className="block py-2.5 text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
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

      <Surface elevated className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">Profile details</h2>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">
          WhatsApp login is fixed at{' '}
          <span className="font-medium text-[var(--ink)]">{user.whatsappNumber}</span>. Add an email
          if you want password reset.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <Field>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Needed for password reset"
            />
          </Field>
          {profileMsg ? <Alert variant="success">{profileMsg}</Alert> : null}
          {profileErr ? <Alert variant="danger">{profileErr}</Alert> : null}
          <Button type="submit" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>

        <div className="mt-8 space-y-3 border-t border-[var(--line)] pt-6">
          <h3 className="font-display text-base font-bold tracking-tight">Avatar</h3>
          {storage.data && !storage.data.configured ? (
            <Alert variant="info">
              Cloudinary is not configured — avatar upload stays disabled until real CLOUDINARY_*
              credentials are set.
            </Alert>
          ) : (
            <>
              <Label htmlFor="avatar">Profile photo (JPEG, PNG, or WebP)</Label>
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
      </Surface>

      <Surface elevated className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">Change password</h2>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">
          Use at least 8 characters. You stay signed in after a successful change.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
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
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Surface>
    </div>
  );
}
