'use client';

import Link from 'next/link';
import { ArrowLeft, Clock3, Keyboard, ListChecks, Play, RotateCcw, Timer } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Fact = { icon: ReactNode; label: string; value: ReactNode };

type Props = {
  eyebrow: string;
  title: string;
  description?: string | null;
  tags?: string[];
  facts: Fact[];
  rules: ReactNode[];
  /** Guests type a candidate name; signed-in users start directly. */
  askName: boolean;
  /** Auth still resolving — keep Start disabled so we know whether to ask. */
  waiting?: boolean;
  backHref: string;
  backLabel: string;
  startLabel?: string;
  starting?: boolean;
  error?: string | null;
  /** Extra controls (e.g. practice timer options) rendered above Start. */
  children?: ReactNode;
  onStart: (name: string | null) => void;
};

/** Pre-start screen shared by Quiz, Model Test and practice sets. */
export function ExamIntro({
  eyebrow,
  title,
  description,
  tags = [],
  facts,
  rules,
  askName,
  waiting,
  backHref,
  backLabel,
  startLabel = 'Start exam',
  starting,
  error,
  children,
  onStart,
}: Props) {
  const id = useId();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const start = () => {
    if (waiting || starting) return;
    if (!askName) {
      onStart(null);
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (trimmed.length > 120) {
      setNameError('Name must be 120 characters or fewer.');
      return;
    }
    onStart(trimmed);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={backHref}
        className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[var(--muted-strong)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>

      <section className="motion-rise overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] bg-[linear-gradient(160deg,var(--brand-wash-strong),transparent_70%)] p-5 sm:p-7">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--highlight)] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 font-display text-2xl leading-snug font-bold break-words text-[var(--ink)] sm:text-[1.75rem]">
            {title}
          </h1>
          {tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {description ? (
            <p className="mt-3 text-sm leading-relaxed break-words text-[var(--muted-strong)]">
              {description}
            </p>
          ) : null}
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <dl
            className={cn(
              'grid gap-2.5',
              facts.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2',
            )}
          >
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-soft)] px-3.5 py-3"
              >
                <dt className="flex items-center gap-1.5 text-xs text-[var(--muted-strong)]">
                  {fact.icon}
                  {fact.label}
                </dt>
                <dd className="mt-1 font-display text-lg font-bold break-words text-[var(--ink)]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">Before you begin</h2>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {rules.map((rule, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--highlight)]"
                  />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {children}

          {askName ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-name`}>Your full name</Label>
              <Input
                id={`${id}-name`}
                value={name}
                autoComplete="name"
                maxLength={120}
                placeholder="e.g. Rahim Uddin"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${id}-name-error` : `${id}-name-hint`}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    start();
                  }
                }}
              />
              {nameError ? (
                <p id={`${id}-name-error`} className="text-sm text-[var(--danger)]">
                  {nameError}
                </p>
              ) : (
                <p id={`${id}-name-hint`} className="text-xs text-[var(--muted)]">
                  Shown on your result sheet.
                </p>
              )}
            </div>
          ) : null}

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={waiting || starting}
            loading={starting}
            onClick={start}
          >
            <Play className="size-4" aria-hidden />
            {starting ? 'Starting…' : startLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

/** Icons for the fact tiles (kept here so callers stay terse). */
export const introIcons = {
  questions: <ListChecks className="size-3.5" aria-hidden />,
  duration: <Clock3 className="size-3.5" aria-hidden />,
  timer: <Timer className="size-3.5" aria-hidden />,
  keyboard: <Keyboard className="size-3.5" aria-hidden />,
  resume: <RotateCcw className="size-3.5" aria-hidden />,
};
