import { PageHeader } from '@/components/layout/page-header';
import { Surface } from '@/components/ui/surface';

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:py-10">
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="What Your Academy collects, why, and what you can ask us to change."
      />
      <Surface className="space-y-5 p-6 text-sm leading-relaxed text-[var(--muted-strong)]">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            What we collect
          </h2>
          <p>
            When you register we collect your name, WhatsApp number, and password (stored hashed —
            we never store it in plain text). An email address is optional unless you need
            password reset by email. An avatar photo is optional. We also record your study
            activity on the platform: bookmarks, practice and exam attempts, and browsing time
            while a study tab is open.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            How we use it
          </h2>
          <p>
            Your details run your account: sign-in, your seven-day trial, your study summary, and
            your saved items. We do not sell your personal information, and we do not share it
            with advertisers. Exam answers and attempts are visible only to you (and to platform
            administrators for support and content quality).
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">Cookies</h2>
          <p>
            Sign-in uses HTTP-only cookies plus a CSRF token. We do not store sign-in tokens in
            browser local storage. Session cookies are needed for the site to work; there are no
            third-party advertising trackers.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            Your choices
          </h2>
          <p>
            You can update your name, email, and avatar from your profile, and change your
            password at any time. To ask for a copy of your data or for your account to be
            deleted, contact us through the channels listed on the site and we will handle the
            request.
          </p>
        </section>
        <p className="text-xs text-[var(--muted)]">Last updated: November 2026.</p>
      </Surface>
    </div>
  );
}
