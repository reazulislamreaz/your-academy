'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, ApiError } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const [whatsappNumber, setWhatsapp] = useState('+880');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ whatsappNumber, password }),
      });
      router.push('/questions');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Welcome back</h1>
      <p className="mt-2 text-[var(--muted)]">Sign in with your WhatsApp number.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[28px] border border-[var(--line)] bg-white/80 p-6 shadow-[var(--shadow)]">
        <label className="block space-y-2 text-sm">
          <span>WhatsApp number</span>
          <Input value={whatsappNumber} onChange={(e) => setWhatsapp(e.target.value)} required />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Password</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        New here? <Link href="/register" className="font-semibold text-[var(--accent)]">Create account</Link>
      </p>
    </div>
  );
}
