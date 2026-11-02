'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, ApiError } from '@/lib/api/client';

export default function RegisterPage() {
  const router = useRouter();
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
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          whatsappNumber: form.whatsappNumber,
          password: form.password,
          ...(form.email ? { email: form.email } : {}),
        }),
      });
      router.push('/questions');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Start learning</h1>
      <p className="mt-2 text-[var(--muted)]">Seven-day full-access trial begins at signup.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[28px] border border-[var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
        {(['name', 'whatsappNumber', 'email', 'password'] as const).map((key) => (
          <label key={key} className="block space-y-2 text-sm capitalize">
            <span>{key === 'whatsappNumber' ? 'WhatsApp number' : key}</span>
            <Input
              type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
              required={key !== 'email'}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button className="w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already have an account? <Link href="/login" className="font-semibold text-[var(--accent)]">Sign in</Link>
      </p>
    </div>
  );
}
