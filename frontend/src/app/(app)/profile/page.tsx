'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { TrialCountdown } from '@/features/auth/trial-countdown';
import { isUnauthorized, meQueryKey, useLogout, useMe } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser, UserStats } from '@/lib/api/types';
import { getStorageStatus, uploadViaSignedRequest } from '@/lib/cloudinary-upload';

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
      setProfileMsg('Profile updated');
      setProfileErr(null);
    },
    onError: (err) => {
      setProfileMsg(null);
      setProfileErr(err instanceof ApiError ? err.message : 'Update failed');
    },
  });

  const changePassword = useMutation({
    mutationFn: () =>
      apiFetch<{ user: MeUser }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: (result) => {
      qc.setQueryData(meQueryKey, result.user);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg('Password changed');
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
      setAvatarMsg('Avatar updated');
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
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
    <div className="space-y-8">
      <PageHeader
        title="Your dashboard"
        description="Profile, trial status, and account security."
        actions={
          <Button variant="outline" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        }
      />

      <Surface className="space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">Trial</h2>
        <TrialCountdown
          trialEndsAt={user.access.trialEndsAt}
          isTrialActive={user.access.isTrialActive}
        />
        <p className="text-sm text-[var(--muted)]">
          {user.access.isTrialActive
            ? 'Answers and explanations are unlocked for the rest of your trial.'
            : 'You can still browse and bookmark. Correct answers stay premium.'}
        </p>
      </Surface>

      <div className="grid gap-4 sm:grid-cols-3">
        <Surface className="p-5">
          <p className="text-sm text-[var(--muted)]">Saved questions</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {stats.data?.questionBookmarks ?? 0}
          </p>
          <Link href="/bookmarks" className="mt-3 inline-block text-sm font-semibold underline-offset-2 hover:underline">
            View saved
          </Link>
        </Surface>
        <Surface className="p-5">
          <p className="text-sm text-[var(--muted)]">Saved PDFs</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {stats.data?.documentBookmarks ?? 0}
          </p>
          <Link
            href="/bookmarks"
            className="mt-3 inline-block text-sm font-semibold underline-offset-2 hover:underline"
          >
            View saved
          </Link>
        </Surface>
        <Surface className="p-5">
          <p className="text-sm text-[var(--muted)]">Browsing time</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {Math.round((stats.data?.browsingSeconds ?? 0) / 60)} min
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">Tracked while you study with this tab open.</p>
        </Surface>
      </div>

      {stats.data &&
      (stats.data.recentQuestions.length > 0 || stats.data.recentDocuments.length > 0) ? (
        <Surface className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Recent saves</h2>
            <Link
              href="/bookmarks"
              className="text-sm font-semibold underline-offset-2 hover:underline"
            >
              All bookmarks
            </Link>
          </div>
          {stats.data.recentQuestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--muted)]">Questions</p>
              <ul className="space-y-2">
                {stats.data.recentQuestions.map((item) => (
                  <li key={item.bookmarkId}>
                    <Link
                      href={`/questions/${item.id}`}
                      className="text-sm font-semibold underline-offset-2 hover:underline"
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
              <p className="text-sm font-medium text-[var(--muted)]">PDFs</p>
              <ul className="space-y-2">
                {stats.data.recentDocuments.map((item) => (
                  <li key={item.bookmarkId}>
                    <Link
                      href={`/documents/${item.id}`}
                      className="text-sm font-semibold underline-offset-2 hover:underline"
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

      <Surface className="p-6">
        <h2 className="font-display text-xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          WhatsApp <span className="font-medium text-[var(--ink)]">{user.whatsappNumber}</span> · Role{' '}
          {user.role}
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Needed for password reset"
            />
          </div>
          {profileMsg ? <Alert variant="success">{profileMsg}</Alert> : null}
          {profileErr ? <Alert variant="danger">{profileErr}</Alert> : null}
          <Button type="submit" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>

        <div className="mt-8 space-y-3 border-t border-[var(--line)] pt-6">
          <h3 className="font-display text-lg font-semibold">Avatar</h3>
          {storage.data && !storage.data.configured ? (
            <Alert variant="info">
              Cloudinary is not configured — avatar upload stays disabled until real CLOUDINARY_*
              credentials are set.
            </Alert>
          ) : (
            <>
              <Label htmlFor="avatar">Profile photo</Label>
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
            <p className="text-sm text-[var(--muted)]">Uploading…</p>
          ) : null}
        </div>
      </Surface>

      <Surface className="p-6">
        <h2 className="font-display text-xl font-semibold">Change password</h2>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
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
          </div>
          {passwordMsg ? <Alert variant="success">{passwordMsg}</Alert> : null}
          {passwordErr ? <Alert variant="danger">{passwordErr}</Alert> : null}
          <Button type="submit" variant="secondary" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Surface>
    </div>
  );
}
