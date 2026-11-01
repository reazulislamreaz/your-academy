import { Entitlement } from '@your-academy/shared';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm tracking-[0.2em] text-[var(--muted)] uppercase">Phase 1</p>
      <h1 className="text-5xl font-semibold tracking-tight text-[var(--foreground)]">Your Academy</h1>
      <p className="max-w-xl text-lg text-[var(--muted)]">
        Subscription-ready MCQ EdTech platform. Monorepo, Docker, and health stubs are online.
      </p>
      <p className="text-sm text-[var(--muted)]">
        Shared package check: <code className="text-[var(--accent)]">{Entitlement.VIEW_ANSWERS}</code>
      </p>
      <a
        className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        href={process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1$/, '') + '/health'}
      >
        API health
      </a>
    </main>
  );
}
