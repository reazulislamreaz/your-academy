'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { meQueryKey } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';

export default function RegisterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    whatsappNumber: '+880',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ user: MeUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          whatsappNumber: form.whatsappNumber,
          password: form.password,
          ...(form.email ? { email: form.email } : {}),
        }),
        skipRefresh: true,
      });
      qc.setQueryData(meQueryKey, result.user);
      router.push('/questions');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Start learning</h1>
        <p className="mt-2 text-[var(--muted)]">Seven-day full-access trial begins at signup.</p>
      </div>
      <Surface className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              required
              value={form.whatsappNumber}
              onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional — needed for password reset)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      </Surface>
      <p className="text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--ink)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
