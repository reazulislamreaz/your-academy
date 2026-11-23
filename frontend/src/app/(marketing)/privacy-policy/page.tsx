import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';

/**
 * Draft policy (DEC-047, NEEDS APPROVAL). Content mirrors what the code actually
 * collects — update this page whenever a data flow, cookie, or vendor changes.
 * Bracketed `[PLACEHOLDERS]` must be filled in before launch.
 */

const LAST_UPDATED = '2026-11-23';
const LAST_UPDATED_LABEL = 'November 23, 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Your Academy collects, uses, stores, and protects your information when you browse questions, create an account, take exams, or contact support.',
  alternates: { canonical: '/privacy-policy' },
};

const SECTIONS = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'information-we-collect', title: 'Information we collect' },
  { id: 'how-we-use-information', title: 'How we use your information' },
  { id: 'cookies', title: 'Cookies and browser storage' },
  { id: 'third-party-services', title: 'Third-party services' },
  { id: 'data-sharing', title: 'How we share information' },
  { id: 'data-retention', title: 'Data retention' },
  { id: 'data-security', title: 'Data security' },
  { id: 'your-rights', title: 'Your rights' },
  { id: 'childrens-privacy', title: "Children's privacy" },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)?.title ?? id;
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24 space-y-3">
      <h2
        id={headingId}
        className="font-display text-xl font-semibold tracking-[-0.01em] text-[var(--ink)] sm:text-2xl"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-semibold text-[var(--ink)]">{children}</h3>;
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[var(--muted)]">{children}</ul>;
}

/** Visually flags text the site owner must replace before publishing. */
function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-100 px-1 font-medium text-amber-900">{children}</mark>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <MarketingPage>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="What we collect when you use Your Academy, why we collect it, and the choices you have."
      />

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="On this page" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
            On this page
          </p>
          <ol className="grid gap-0.5 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-10 items-center rounded-md px-2 text-[var(--muted-strong)] transition-colors hover:text-[var(--ink)] focus-visible:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 max-w-3xl space-y-10 text-[0.9375rem] leading-relaxed text-[var(--muted-strong)] sm:text-base">
          <p className="text-sm text-[var(--muted)]">
            Last updated: <time dateTime={LAST_UPDATED}>{LAST_UPDATED_LABEL}</time>
          </p>

          <Section id="introduction">
            <p>
              Your Academy (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an online exam-preparation
              platform operated by <Placeholder>[COMPANY NAME]</Placeholder>. It offers Preli MCQ
              and Written question banks, timed exams and model tests, newspaper column PDFs, and
              learner tools such as bookmarks and progress tracking.
            </p>
            <p>
              This policy explains how we handle personal information when you visit our website,
              create an account, take an exam, or contact our support team. By using Your Academy
              you agree to the practices described here.
            </p>
          </Section>

          <Section id="information-we-collect">
            <SubHeading>Information you give us</SubHeading>
            <List>
              <li>
                <strong className="text-[var(--ink)]">Account details:</strong> your name, WhatsApp
                number, and password when you register. Your password is stored only as a one-way
                hash; we never store or see it in plain text.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Optional profile details:</strong> an email
                address (used for password reset), a profile photo, and the exam categories you
                choose during onboarding.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Exam and quiz submissions:</strong> the name
                you enter before a timed exam or model test, your selected answers, score, and time
                taken. You can take these without an account; if you are signed in, or register
                later, the result is linked to your account.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Support messages:</strong> when you use live
                support chat, the messages and any files you attach. If you are not signed in, we
                also ask for your name and WhatsApp number so we can reply.
              </li>
            </List>

            <SubHeading>Information collected as you use the service</SubHeading>
            <List>
              <li>
                <strong className="text-[var(--ink)]">Learning activity:</strong> questions you
                attempt and answer, practice sets and exams you start or finish, bookmarks and
                collections you create, and the last question you viewed so you can resume.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Study time:</strong> while you are signed in
                and active, the app periodically records that your session is still open so we can
                show your study-time statistics.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Session and device information:</strong> your
                IP address and browser user-agent when you sign in, and IP address for certain
                security-relevant actions. Our web servers also keep standard request logs.
              </li>
            </List>

            <p>
              We do not use advertising networks, and we do not use third-party analytics or
              tracking tools. We do not process payments on the website.
            </p>
          </Section>

          <Section id="how-we-use-information">
            <p>We use your information to:</p>
            <List>
              <li>create and secure your account, keep you signed in, and reset your password;</li>
              <li>
                show questions, record your answers, score exams, and display your progress,
                bookmarks, and history;
              </li>
              <li>
                decide which content your account can access (for example, whether answers and
                explanations are available under an active subscription);
              </li>
              <li>respond to your support requests;</li>
              <li>
                detect and prevent abuse, such as repeated failed logins or stolen sessions, and
                keep an audit trail of administrative actions;
              </li>
              <li>maintain, troubleshoot, and improve the service.</li>
            </List>
            <p>
              We do not sell your personal information and do not use it for advertising.
              <Placeholder>[If your jurisdiction requires a stated legal basis for processing
              (e.g. contract, legitimate interests, consent), add it here.]</Placeholder>
            </p>
          </Section>

          <Section id="cookies">
            <p>
              We use only cookies and browser storage that are needed for the site to work or to
              remember your display preferences. We do not use advertising or analytics cookies.
            </p>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <caption className="sr-only">Cookies and browser storage used by Your Academy</caption>
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--ink)]">
                    <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Type</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Purpose</th>
                    <th scope="col" className="py-2 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]/70 align-top">
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">access_token</td>
                    <td className="py-2 pr-4">Cookie (HTTP-only)</td>
                    <td className="py-2 pr-4">Keeps you signed in</td>
                    <td className="py-2">15 minutes</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">refresh_token</td>
                    <td className="py-2 pr-4">Cookie (HTTP-only)</td>
                    <td className="py-2 pr-4">Renews your sign-in without asking for your password</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">csrf_token</td>
                    <td className="py-2 pr-4">Cookie</td>
                    <td className="py-2 pr-4">Protects forms against cross-site request forgery</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">support_guest_token</td>
                    <td className="py-2 pr-4">Cookie (HTTP-only)</td>
                    <td className="py-2 pr-4">Lets guests continue a support chat</td>
                    <td className="py-2">30 days</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">ya-learner-color-scheme, ya-preli-show-all-answers</td>
                    <td className="py-2 pr-4">Local storage</td>
                    <td className="py-2 pr-4">Remembers light/dark theme and answer-display preference</td>
                    <td className="py-2">Until you clear it</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">ya-guest-exam:*</td>
                    <td className="py-2 pr-4">Session storage</td>
                    <td className="py-2 pr-4">Saves an in-progress exam so a page refresh does not lose answers</td>
                    <td className="py-2">Until the tab is closed</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              You can block or delete cookies in your browser settings, but you will not be able to
              sign in without the authentication cookies.
            </p>
          </Section>

          <Section id="third-party-services">
            <p>We rely on a small number of service providers to run Your Academy:</p>
            <List>
              <li>
                <strong className="text-[var(--ink)]">Cloudinary</strong> stores and delivers
                uploaded files, such as profile photos, support-chat attachments, and published
                PDFs. See{' '}
                <a
                  href="https://cloudinary.com/privacy"
                  className="text-[var(--accent)] underline underline-offset-2"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Cloudinary&rsquo;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong className="text-[var(--ink)]">Email delivery</strong> via{' '}
                <Placeholder>[EMAIL PROVIDER]</Placeholder> to send password-reset emails to the
                address on your account.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Hosting</strong> on servers provided by{' '}
                <Placeholder>[HOSTING PROVIDER]</Placeholder>
                {' '}located in <Placeholder>[SERVER COUNTRY/REGION]</Placeholder>, where our
                database and application run.
              </li>
            </List>
            <p>
              Our footer links to our social media profiles. Those sites are operated by third
              parties under their own privacy policies; we do not embed their tracking scripts on
              our pages.
            </p>
          </Section>

          <Section id="data-sharing">
            <p>We share personal information only:</p>
            <List>
              <li>with the service providers listed above, solely to operate the service;</li>
              <li>
                with our authorised administrators and support staff, who can see account details,
                exam results, and support conversations in order to manage the platform and help you;
              </li>
              <li>
                when required by law, or to protect the rights, safety, and security of our users
                and the service;
              </li>
              <li>
                as part of a merger, acquisition, or sale of assets, in which case we will tell you
                beforehand.
              </li>
            </List>
          </Section>

          <Section id="data-retention">
            <List>
              <li>
                <strong className="text-[var(--ink)]">Account and learning data</strong> is kept
                while your account is active. When an account is deleted, we remove or anonymise its
                personal data within <Placeholder>[RETENTION PERIOD]</Placeholder>, except where we
                must keep it to meet legal obligations or resolve disputes.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Sign-in sessions</strong> expire after 30
                days of inactivity, and when you log out or change your password.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Password-reset links</strong> expire shortly
                after they are sent and can be used only once.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Guest exam results and support chats</strong>{' '}
                are kept for <Placeholder>[RETENTION PERIOD]</Placeholder>.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Server and security logs</strong> are kept for{' '}
                <Placeholder>[LOG RETENTION PERIOD]</Placeholder>.
              </li>
            </List>
          </Section>

          <Section id="data-security">
            <p>We protect your information with measures including:</p>
            <List>
              <li>encrypted HTTPS connections;</li>
              <li>passwords hashed with Argon2id;</li>
              <li>
                short-lived sign-in tokens kept in HTTP-only cookies that page scripts cannot read,
                with rotation and reuse detection;
              </li>
              <li>CSRF protection and rate limits on sign-in, registration, and password reset;</li>
              <li>role-based access so only administrators can reach admin tools;</li>
              <li>
                databases that are not exposed to the public internet, and file uploads restricted
                by type and size.
              </li>
            </List>
            <p>
              No method of transmission or storage is completely secure, so we cannot guarantee
              absolute security. If we learn of a breach affecting your information, we will notify
              you as required by law.
            </p>
          </Section>

          <Section id="your-rights">
            <p>Depending on where you live, you may have the right to:</p>
            <List>
              <li>
                <strong className="text-[var(--ink)]">Access</strong> the personal information we
                hold about you;
              </li>
              <li>
                <strong className="text-[var(--ink)]">Correct</strong> inaccurate information. You
                can update your name, email, and profile photo yourself on your profile page;
              </li>
              <li>
                <strong className="text-[var(--ink)]">Delete</strong> your account and personal
                information;
              </li>
              <li>object to or restrict certain processing, and receive a copy of your data.</li>
            </List>
            <p>
              To make a request, contact us using the details below. We may need to verify that the
              account belongs to you, and we will respond within{' '}
              <Placeholder>[RESPONSE TIME, e.g. 30 days]</Placeholder>.
            </p>
          </Section>

          <Section id="childrens-privacy">
            <p>
              Your Academy is intended for people preparing for competitive and job exams. It is
              not directed at children under <Placeholder>[MINIMUM AGE]</Placeholder>, and we do not
              knowingly collect personal information from them. If you believe a child has given us
              personal information, contact us and we will delete it.
            </p>
          </Section>

          <Section id="changes">
            <p>
              We may update this policy from time to time. When we do, we will change the
              &ldquo;Last updated&rdquo; date at the top of this page. If the changes are
              significant, we will also give notice on the site or contact you.
            </p>
          </Section>

          <Section id="contact">
            <p>For questions about this policy or your personal information, contact:</p>
            <address className="not-italic">
              <Placeholder>[COMPANY NAME]</Placeholder>
              <br />
              <Placeholder>[POSTAL ADDRESS]</Placeholder>
              <br />
              Email: <Placeholder>[CONTACT EMAIL]</Placeholder>
            </address>
            <p>
              This policy is governed by the laws of <Placeholder>[JURISDICTION]</Placeholder>. You
              can also browse the <Link href="/#faq" className="text-[var(--accent)] underline underline-offset-2">FAQ</Link>{' '}
              for general help.
            </p>
          </Section>
        </article>
      </div>
    </MarketingPage>
  );
}
