import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';

/**
 * Privacy Policy (DEC-047). Content mirrors what the code and production config
 * actually do — update this page whenever a data flow, cookie, vendor, or TTL changes.
 * Cookie durations match `.env.production` (access 900s, refresh 604800s).
 */

const LAST_UPDATED = '2026-11-23';
const LAST_UPDATED_LABEL = 'November 23, 2026';
const CONTACT_EMAIL = 'youracademy04@gmail.com';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Your Academy collects, uses, stores, shares, and protects personal information when you browse questions, create an account, take exams, or contact support.',
  alternates: { canonical: '/privacy-policy' },
};

const SECTIONS = [
  { id: 'introduction', title: 'Introduction and scope' },
  { id: 'information-we-collect', title: 'Information we collect' },
  { id: 'how-we-collect', title: 'How we collect information' },
  { id: 'how-we-use', title: 'How we use personal information' },
  { id: 'exam-learning-data', title: 'Exam and learning activity data' },
  { id: 'cookies', title: 'Cookies and browser storage' },
  { id: 'third-party-services', title: 'Third-party services' },
  { id: 'storage-security', title: 'Data storage and security' },
  { id: 'data-retention', title: 'Data retention' },
  { id: 'your-rights', title: 'Your privacy rights' },
  { id: 'account-deletion', title: 'Account deletion requests' },
  { id: 'data-sharing', title: 'Data sharing and disclosure' },
  { id: 'childrens-privacy', title: "Children's privacy and minimum age" },
  { id: 'international-transfers', title: 'International data transfers' },
  { id: 'legal-basis', title: 'Legal basis for processing' },
  { id: 'changes', title: 'Changes to this Privacy Policy' },
  { id: 'contact', title: 'Contact us' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const LINK_CLASS =
  'font-medium text-[var(--accent)] underline underline-offset-2 hover:text-[var(--ink)]';

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const index = SECTIONS.findIndex((s) => s.id === id);
  const title = SECTIONS[index]?.title ?? id;
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24 space-y-3">
      <h2
        id={headingId}
        className="font-display text-xl font-semibold tracking-[-0.01em] text-[var(--ink)] sm:text-2xl"
      >
        <span className="mr-2 text-[var(--muted)] tabular-nums">{index + 1}.</span>
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

function Term({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-[var(--ink)]">{children}</strong>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={LINK_CLASS} rel="noopener noreferrer" target="_blank">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function MailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={`${LINK_CLASS} break-all`}>
      {CONTACT_EMAIL}
    </a>
  );
}

type StorageRow = { name: string; kind: string; purpose: string; duration: string };

const STORAGE_ROWS: StorageRow[] = [
  {
    name: 'access_token',
    kind: 'Cookie, HTTP-only',
    purpose: 'Keeps you signed in',
    duration: '15 minutes',
  },
  {
    name: 'refresh_token',
    kind: 'Cookie, HTTP-only',
    purpose: 'Renews your sign-in without asking for your password again',
    duration: '7 days',
  },
  {
    name: 'csrf_token',
    kind: 'Cookie',
    purpose: 'Protects your account against cross-site request forgery',
    duration: '7 days',
  },
  {
    name: 'support_guest_token',
    kind: 'Cookie, HTTP-only',
    purpose: 'Lets a visitor who is not signed in continue a support chat',
    duration: '30 days',
  },
  {
    name: 'Cloudflare security cookies (e.g. __cf_bm)',
    kind: 'Cookie, set by Cloudflare',
    purpose: 'May be set to protect the site from bots and attacks',
    duration: 'Set by Cloudflare, typically up to 30 minutes',
  },
  {
    name: 'ya-learner-color-scheme',
    kind: 'Local storage',
    purpose: 'Remembers your light or dark theme',
    duration: 'Until you clear it',
  },
  {
    name: 'ya-preli-show-all-answers',
    kind: 'Local storage',
    purpose: 'Remembers your answer-display preference in the question bank',
    duration: 'Until you clear it',
  },
  {
    name: 'ya-guest-exam:…',
    kind: 'Session storage',
    purpose: 'Keeps an in-progress exam so a page refresh does not lose your answers',
    duration: 'Until you close the tab',
  },
];

function StorageTable() {
  return (
    <>
      {/* Phones: stacked cards — no horizontal scrolling. */}
      <ul className="space-y-3 sm:hidden" aria-label="Cookies and browser storage">
        {STORAGE_ROWS.map((row) => (
          <li
            key={row.name}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
          >
            <p className="font-mono text-[0.8125rem] font-medium break-words text-[var(--ink)]">
              {row.name}
            </p>
            <dl className="mt-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
              <dt className="text-[var(--muted)]">Type</dt>
              <dd>{row.kind}</dd>
              <dt className="text-[var(--muted)]">Purpose</dt>
              <dd>{row.purpose}</dd>
              <dt className="text-[var(--muted)]">Duration</dt>
              <dd>{row.duration}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-[var(--line)] sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Cookies and browser storage used by Your Academy</caption>
          <thead className="bg-[var(--line)]/25 text-[var(--ink)]">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Name</th>
              <th scope="col" className="px-4 py-3 font-semibold">Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">Purpose</th>
              <th scope="col" className="px-4 py-3 font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]/70 align-top">
            {STORAGE_ROWS.map((row) => (
              <tr key={row.name}>
                <th
                  scope="row"
                  className="px-4 py-3 font-mono text-xs font-medium break-words text-[var(--ink)]"
                >
                  {row.name}
                </th>
                <td className="px-4 py-3">{row.kind}</td>
                <td className="px-4 py-3">{row.purpose}</td>
                <td className="px-4 py-3">{row.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <MarketingPage>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="What personal information Your Academy collects, why we collect it, who we share it with, and the choices you have."
      />

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Privacy Policy sections"
          className="min-w-0 rounded-xl border border-[var(--line)] p-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:border-0 lg:p-0"
        >
          <p className="mb-2 px-2 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
            On this page
          </p>
          <ol className="grid gap-0.5 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex min-h-10 items-center gap-2 rounded-md px-2 text-[var(--muted-strong)] transition-colors hover:bg-[var(--line)]/25 hover:text-[var(--ink)] focus-visible:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="w-5 shrink-0 text-right text-xs text-[var(--muted)] tabular-nums">
                    {i + 1}.
                  </span>
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
              Your Academy (&ldquo;Your Academy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an
              online learning and examination platform at{' '}
              <Link href="/" className={LINK_CLASS}>
                youracademy.com.bd
              </Link>
              . We offer Preli MCQ and Written question banks, topic-based practice, timed exams and
              model tests, newspaper column PDFs, and learner tools such as bookmarks and progress
              tracking.
            </p>
            <p>
              This Privacy Policy applies to everyone who visits our website, creates an account,
              takes an exam, or contacts our support team. It explains what personal information we
              handle and how. By using Your Academy, you acknowledge the practices described here.
            </p>
          </Section>

          <Section id="information-we-collect">
            <SubHeading>Information you give us</SubHeading>
            <List>
              <li>
                <Term>Account details:</Term> your name, WhatsApp number, and password when you
                register. Your WhatsApp number is your sign-in ID and must be unique.
              </li>
              <li>
                <Term>Optional profile details:</Term> an email address (needed only for password
                reset), a profile photo, and up to three exam categories you choose during
                onboarding.
              </li>
              <li>
                <Term>Exam submissions:</Term> the name you enter before a timed exam or model test,
                your selected answers, your score, and the time taken.
              </li>
              <li>
                <Term>Support messages:</Term> messages and files you send through live support
                chat. If you are not signed in, we also ask for your name and WhatsApp number so we
                can identify and reply to you.
              </li>
            </List>

            <SubHeading>Information created as you use the service</SubHeading>
            <List>
              <li>
                <Term>Learning activity:</Term> practice history, bookmarks, collections, and study
                time (see <a href="#exam-learning-data" className={LINK_CLASS}>section 5</a>).
              </li>
              <li>
                <Term>Sign-in and device information:</Term> the IP address and browser user-agent
                recorded when you sign in, and a list of your active sign-in sessions.
              </li>
              <li>
                <Term>Security records:</Term> IP addresses linked to security-relevant and
                administrative actions, and standard web server request logs.
              </li>
            </List>

            <SubHeading>What we do not collect</SubHeading>
            <p>
              We do not use advertising networks or third-party analytics and tracking tools. We do
              not take payments on the website, so we do not collect card or bank details.
            </p>
          </Section>

          <Section id="how-we-collect">
            <List>
              <li>
                <Term>Directly from you</Term>, when you register, edit your profile, take an exam,
                bookmark a question, or message support.
              </li>
              <li>
                <Term>Automatically</Term>, when your browser talks to our servers. This includes
                sign-in cookies, IP address, user-agent, and activity signals sent while you study.
              </li>
              <li>
                <Term>From our administrators</Term>, who may update your account status (for
                example, activating a subscription or suspending an account for misuse).
              </li>
            </List>
            <p>We do not buy personal information or obtain it from data brokers.</p>
          </Section>

          <Section id="how-we-use">
            <p>We use personal information to:</p>
            <List>
              <li>create and secure your account, keep you signed in, and reset your password;</li>
              <li>
                show questions, record and score your answers, and display your progress, results,
                bookmarks, and history;
              </li>
              <li>
                decide which content your account can access, for example whether correct answers
                and explanations are available to you;
              </li>
              <li>respond to your support requests and contact you about them;</li>
              <li>
                detect and prevent abuse, such as repeated failed logins, stolen sessions, or misuse
                of the service, and keep an audit trail of administrative actions;
              </li>
              <li>maintain, troubleshoot, and improve the platform;</li>
              <li>comply with legal obligations.</li>
            </List>
            <p>
              We do not sell or rent personal information, and we do not use it for advertising or
              profiling.
            </p>
          </Section>

          <Section id="exam-learning-data">
            <p>Learning features need us to record what you do on the platform:</p>
            <List>
              <li>
                <Term>Exams and model tests:</Term> you can take these without an account. Each
                submission stores the name you entered, your answers, score, correct and wrong
                counts, time taken, and whether time ran out. If you are signed in, or register
                afterwards, the result is linked to your account.
              </li>
              <li>
                <Term>Practice and quizzes:</Term> attempts, answers, scores, pass or fail result,
                questions marked for review, and progress saved automatically during a timed quiz.
              </li>
              <li>
                <Term>Activity history:</Term> questions you attempt, practice sets you start and
                finish, and the last question you viewed so you can resume where you stopped.
              </li>
              <li>
                <Term>Bookmarks:</Term> saved questions, saved PDFs, and the collections you organise
                them into.
              </li>
              <li>
                <Term>Study time:</Term> while you are signed in, the app sends a signal every 30
                seconds to record that your study session is still active. We store the session
                start and end time, total active seconds, and your browser user-agent. We use this
                only to show you your study statistics and for overall platform figures.
              </li>
            </List>
            <p>
              Administrators can see exam and quiz results to manage the platform. We do not publish
              your results or show them to other learners.
            </p>
          </Section>

          <Section id="cookies">
            <p>
              We use only cookies and browser storage that are needed for the site to work, keep
              your account secure, or remember your display preferences. We do not use advertising
              or analytics cookies.
            </p>
            <StorageTable />
            <p>
              You can block or delete cookies in your browser settings. If you block the sign-in
              cookies, you will not be able to sign in.
            </p>
          </Section>

          <Section id="third-party-services">
            <p>
              We use the following service providers to run Your Academy. Each receives only the
              information it needs to provide its service to us.
            </p>
            <List>
              <li>
                <Term>BahariHost</Term> (
                <ExternalLink href="https://baharihost.com/">baharihost.com</ExternalLink>) provides
                the virtual private server that runs our website, application, database, and file
                processing. BahariHost is our hosting provider only. It does not own or operate Your
                Academy.
              </li>
              <li>
                <Term>Cloudflare</Term> provides our domain name service, delivers web traffic to our
                server, and protects the site against attacks. All requests to our website, including
                your IP address and browser details, pass through Cloudflare&rsquo;s network. See{' '}
                <ExternalLink href="https://www.cloudflare.com/privacypolicy/">
                  Cloudflare&rsquo;s Privacy Policy
                </ExternalLink>
                .
              </li>
              <li>
                <Term>Cloudinary</Term> stores and delivers uploaded files, such as profile photos,
                support-chat attachments, and published PDFs. See{' '}
                <ExternalLink href="https://cloudinary.com/privacy">
                  Cloudinary&rsquo;s Privacy Policy
                </ExternalLink>
                .
              </li>
              <li>
                <Term>Google (Gmail)</Term> sends our password-reset emails. When you request a
                reset, your email address and the reset link pass through Google&rsquo;s mail
                servers. See{' '}
                <ExternalLink href="https://policies.google.com/privacy">
                  Google&rsquo;s Privacy Policy
                </ExternalLink>
                .
              </li>
            </List>
            <p>
              Our website footer links to our social media profiles. Those platforms run under their
              own privacy policies. We do not embed their tracking scripts on our pages.
            </p>
          </Section>

          <Section id="storage-security">
            <p>
              Your account data, learning records, and support conversations are stored in a
              PostgreSQL database on our BahariHost server. Uploaded files are stored with
              Cloudinary. We protect personal information with:
            </p>
            <List>
              <li>encrypted HTTPS connections between your browser, Cloudflare, and our server;</li>
              <li>passwords stored only as Argon2id hashes, never in plain text;</li>
              <li>
                short-lived sign-in tokens in HTTP-only cookies that page scripts cannot read, with
                token rotation and stolen-token detection;
              </li>
              <li>protection against cross-site request forgery;</li>
              <li>rate limits on sign-in, registration, and password reset;</li>
              <li>role-based access, so only administrators can use admin tools;</li>
              <li>a database and cache that are not exposed to the public internet;</li>
              <li>upload checks on file type and size;</li>
              <li>database backups for recovery, with access limited to authorised administrators.</li>
            </List>
            <p>
              No method of transmission or storage is completely secure, so we cannot guarantee
              absolute security. If a breach affects your personal information, we will notify you
              and the relevant authorities as required by law.
            </p>
          </Section>

          <Section id="data-retention">
            <p>We keep personal information only as long as we need it:</p>
            <List>
              <li>
                <Term>Account, learning, and bookmark data:</Term> while your account is active.
                After a verified deletion request, we delete or anonymise it within 30 days.
              </li>
              <li>
                <Term>Sign-in sessions:</Term> a session ends after 7 days without use, or
                immediately when you log out or change your password.
              </li>
              <li>
                <Term>Password-reset links:</Term> expire after 1 hour and work only once.
              </li>
              <li>
                <Term>Guest exam results and support conversations:</Term> up to 24 months from the
                last activity, then deleted or anonymised.
              </li>
              <li>
                <Term>Security and audit records:</Term> up to 12 months, unless we need them longer
                to investigate abuse or meet a legal requirement.
              </li>
              <li>
                <Term>Server logs:</Term> rotated automatically by size, so older entries are
                overwritten and logs are never kept indefinitely. Cloudflare keeps its own logs
                under its privacy policy.
              </li>
              <li>
                <Term>Backups:</Term> deleted data may remain in backups for up to 90 days before it
                is overwritten.
              </li>
            </List>
            <p>
              We may keep information longer if the law requires it, or to resolve disputes and
              enforce our terms.
            </p>
          </Section>

          <Section id="your-rights">
            <p>Subject to applicable law, you can ask us to:</p>
            <List>
              <li>
                <Term>Access</Term> the personal information we hold about you, and receive a copy;
              </li>
              <li>
                <Term>Correct</Term> inaccurate information. You can update your name and email
                yourself on your profile page;
              </li>
              <li>
                <Term>Delete</Term> your account and personal information (see{' '}
                <a href="#account-deletion" className={LINK_CLASS}>section 11</a>);
              </li>
              <li>
                <Term>Object to or restrict</Term> certain processing;
              </li>
              <li>
                <Term>Withdraw consent</Term> where we rely on it, for example by removing your
                optional email or profile photo.
              </li>
            </List>
            <p>
              To make a request, email <MailLink /> from the email address on your account, or
              include your registered WhatsApp number. We may ask you to confirm your identity
              before acting. We aim to respond within 30 days.
            </p>
          </Section>

          <Section id="account-deletion">
            <p>
              You can ask us to delete your account at any time. Email <MailLink /> with the subject
              &ldquo;Account deletion request&rdquo; and include your registered WhatsApp number.
              After we confirm the request comes from you, we will:
            </p>
            <List>
              <li>close your account and end all sign-in sessions;</li>
              <li>
                delete or anonymise your profile, profile photo, learning history, bookmarks, and
                linked exam results within 30 days;
              </li>
              <li>
                keep only what we must retain by law or to prevent fraud, such as limited security
                records, for the periods described in{' '}
                <a href="#data-retention" className={LINK_CLASS}>section 9</a>.
              </li>
            </List>
            <p>Deletion is permanent. We cannot restore an account or its history afterwards.</p>
          </Section>

          <Section id="data-sharing">
            <p>We share personal information only:</p>
            <List>
              <li>
                with the service providers listed in{' '}
                <a href="#third-party-services" className={LINK_CLASS}>section 7</a>, only so they
                can provide their services to us;
              </li>
              <li>
                with our authorised administrators and support staff, who can see account details,
                results, and support conversations to manage the platform and help you;
              </li>
              <li>
                when the law, a court order, or a government authority requires it, or to protect the
                rights, safety, and security of our users, the public, or Your Academy;
              </li>
              <li>
                as part of a merger, acquisition, or transfer of the platform. We will notify you
                before your information becomes subject to a different privacy policy.
              </li>
            </List>
            <p>We do not sell personal information.</p>
          </Section>

          <Section id="childrens-privacy">
            <p>
              Your Academy is designed for students and job seekers preparing for competitive
              exams. You must be at least 13 years old to create an account. If you are under 18, use
              Your Academy only with the permission and supervision of a parent or guardian.
            </p>
            <p>
              We do not knowingly collect personal information from children under 13. If you
              believe a child under 13 has given us personal information, email <MailLink /> and we
              will delete it.
            </p>
          </Section>

          <Section id="international-transfers">
            <p>
              Your Academy is operated from Bangladesh. Some of our service providers, including
              Cloudflare, Cloudinary, and Google, run global infrastructure, so your information may
              be processed or stored in other countries. Data protection laws there may differ from
              those in Bangladesh.
            </p>
            <p>
              We choose established providers that publish privacy and security commitments, and we
              share only the information each provider needs.
            </p>
          </Section>

          <Section id="legal-basis">
            <p>We process personal information on these grounds:</p>
            <List>
              <li>
                <Term>To provide the service you request:</Term> creating your account, signing you
                in, recording exams and practice, and answering support messages.
              </li>
              <li>
                <Term>Legitimate interests:</Term> keeping the platform secure, preventing abuse,
                keeping audit records, and improving the service, balanced against your rights.
              </li>
              <li>
                <Term>Consent:</Term> optional information you choose to give, such as an email
                address or profile photo. You can withdraw consent by removing it.
              </li>
              <li>
                <Term>Legal obligations:</Term> when the law requires us to keep or disclose
                information.
              </li>
            </List>
            <p>
              We handle personal information in line with the laws of Bangladesh that apply to us.
            </p>
          </Section>

          <Section id="changes">
            <p>
              We may update this Privacy Policy as the platform changes or as the law requires. When
              we do, we will update the &ldquo;Last updated&rdquo; date at the top of this page. If
              the changes are significant, we will also tell you on the website or by another
              reasonable method before they take effect.
            </p>
          </Section>

          <Section id="contact">
            <p>
              For questions about this Privacy Policy, or to exercise your privacy rights, contact
              us:
            </p>
            <div className="rounded-xl border border-[var(--line)] p-4 sm:p-5">
              <p className="font-semibold text-[var(--ink)]">Your Academy</p>
              <p className="mt-1">
                Email: <MailLink />
              </p>
              <p className="mt-1">
                Website:{' '}
                <Link href="/" className={LINK_CLASS}>
                  youracademy.com.bd
                </Link>
              </p>
            </div>
            <p>
              For general help with using the platform, see our{' '}
              <Link href="/#faq" className={LINK_CLASS}>
                frequently asked questions
              </Link>
              .
            </p>
          </Section>
        </article>
      </div>
    </MarketingPage>
  );
}
