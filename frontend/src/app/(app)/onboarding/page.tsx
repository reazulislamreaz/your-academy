'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { isUnauthorized, meQueryKey, useMe } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { CategoryNode, MeUser } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { OnboardingPageSkeleton, HomeActivityListSkeleton } from '@/components/skeletons';

export default function OnboardingPage() {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
    enabled: Boolean(me.data),
  });

  useEffect(() => {
    const ids = me.data?.study?.preferredCategoryIds;
    if (ids) setSelected(ids);
  }, [me.data?.study?.preferredCategoryIds]);

  const savePrefs = useMutation({
    mutationFn: (body: {
      preferredCategoryIds: string[];
      onboardingCompleted: boolean;
    }) =>
      apiFetch<MeUser>('/users/me/study-prefs', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (user) => {
      qc.setQueryData(meQueryKey, user);
    },
  });

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function finish(href: string) {
    setError(null);
    try {
      await savePrefs.mutateAsync({
        preferredCategoryIds: selected,
        onboardingCompleted: true,
      });
      router.push(href);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save preferences');
    }
  }

  if (me.isLoading) {
    return <OnboardingPageSkeleton />;
  }

  if (isUnauthorized(me.error) || !me.data) {
    return (
      <Alert variant="warning">
        Sign in to continue onboarding.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Getting started"
        title={step === 1 ? 'What do you want to practice?' : 'Your seven-day trial'}
        description={
          step === 1
            ? 'Pick up to three topics. We save these on your account to suggest a starting path.'
            : 'Full answers unlock for one week. After that, browsing stays open — answer keys stay premium.'
        }
      />

      <div className="flex gap-2" aria-label="Onboarding progress">
        <span
          className={cn(
            'h-1.5 flex-1 rounded-full',
            step >= 1 ? 'bg-[var(--highlight)]' : 'bg-[var(--bg-muted)]',
          )}
        />
        <span
          className={cn(
            'h-1.5 flex-1 rounded-full',
            step >= 2 ? 'bg-[var(--highlight)]' : 'bg-[var(--bg-muted)]',
          )}
        />
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {step === 1 ? (
        <Surface className="space-y-4 p-6">
          {categories.isLoading ? <HomeActivityListSkeleton rows={4} /> : null}
          {categories.data && categories.data.length === 0 ? (
            <p className="text-sm text-[var(--muted-strong)]">No categories yet — you can skip this step.</p>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {(categories.data ?? []).map((cat) => {
              const on = selected.includes(cat.id);
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    aria-pressed={on}
                    className={cn(
                      'motion-press w-full rounded-[var(--radius)] border px-4 py-3 text-left transition-colors',
                      on
                        ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
                        : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--line-strong)]',
                    )}
                  >
                    <span className="font-display font-semibold tracking-tight">{cat.name}</span>
                    <span className="mt-1 block text-xs text-[var(--muted-strong)]">
                      {cat.children.length} subtopics
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-[var(--muted-strong)]">{selected.length}/3 selected</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => setStep(2)}>Continue</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Skip
            </Button>
          </div>
        </Surface>
      ) : (
        <Surface className="space-y-5 p-6">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="font-display text-sm font-bold text-[var(--highlight)]">01</span>
              <div>
                <p className="font-semibold">Trial starts now</p>
                <p className="text-sm text-[var(--muted-strong)]">
                  Ends {new Date(me.data.access.trialEndsAt).toLocaleString()}.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sm font-bold text-[var(--highlight)]">02</span>
              <div>
                <p className="font-semibold">Practice with explanations</p>
                <p className="text-sm text-[var(--muted-strong)]">
                  Correct answers are shown only while your trial (or a future plan) is active.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-sm font-bold text-[var(--highlight)]">03</span>
              <div>
                <p className="font-semibold">Nothing vanishes after day seven</p>
                <p className="text-sm text-[var(--muted-strong)]">
                  Keep browsing questions, options, PDFs, and news for free.
                </p>
              </div>
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">
            <Button
              disabled={savePrefs.isPending}
              onClick={() => {
                const first = selected[0];
                void finish(first ? `/questions?categoryId=${first}` : '/questions');
              }}
            >
              {savePrefs.isPending ? 'Saving…' : 'Start practicing'}
            </Button>
            <Button
              variant="outline"
              disabled={savePrefs.isPending}
              onClick={() => void finish('/home')}
            >
              Go to study home
            </Button>
            <Button variant="ghost" disabled={savePrefs.isPending} onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </Surface>
      )}
    </div>
  );
}
