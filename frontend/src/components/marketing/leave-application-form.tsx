import type { ReactNode } from 'react';
import Image from 'next/image';
import { Caveat } from 'next/font/google';

const hand = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

function Check({ checked = false }: { checked?: boolean }) {
  return (
    <span
      className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center border border-black bg-white align-middle"
      aria-hidden
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
          <path
            d="M2 6.2 L4.8 9 L10 2.8"
            stroke="#111"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function Hand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`${hand.className} text-[1.35rem] leading-none text-[#1a1a1a] ${className}`}>{children}</span>;
}

const APPROVALS = [
  {
    title: 'Employee',
    approved: true,
    rejected: false,
    signature: 'Reaz',
    date: '08-11-2026',
  },
  {
    title: 'Team Leader',
    approved: true,
    rejected: false,
    signature: 'Abir',
    date: '08.11.2026',
  },
  {
    title: 'Department Head',
    approved: true,
    rejected: false,
    signature: 'Fayez',
    date: '08-11-26',
    people: ['Opu', 'Fahim', 'Sahinur', 'Rafsan'] as const,
  },
  {
    title: 'General Manager',
    approved: false,
    rejected: false,
    signature: '',
    date: '',
  },
  {
    title: 'HR',
    approved: false,
    rejected: false,
    signature: '',
    date: '',
  },
] as const;

export function LeaveApplicationForm() {
  return (
    <div className="leave-form-page min-h-screen bg-[#d8d8d6] px-3 py-6 sm:px-6 sm:py-10">
      <article
        className="mx-auto w-full max-w-[920px] bg-white px-5 py-6 text-[13px] text-black shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:px-9 sm:py-8"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-4">
          <Image
            src="/images/leave-form/sparktech-logo.png"
            alt="Sparktech Agency"
            width={220}
            height={64}
            priority
            className="h-12 w-auto object-contain object-left sm:h-14"
          />
          <div className="pt-1 text-right leading-tight text-[#333]">
            <p className="text-[11px] sm:text-[12px]">a Concern of</p>
            <p className="text-[15px] font-medium tracking-tight sm:text-[17px]">betopia group</p>
          </div>
        </header>

        <h1 className="mt-5 text-center text-[18px] font-bold tracking-[0.04em] uppercase sm:text-[22px]">
          Leave Application Form
        </h1>
        <div className="mx-auto mt-1 h-px w-[min(100%,420px)] bg-[#333]" />

        {/* Personal info */}
        <table className="mt-5 w-full border-collapse border border-[#222] text-left">
          <tbody>
            <tr>
              <th className="w-[9%] border border-[#222] bg-[#317d5f] px-2 py-1.5 text-center text-[12px] font-semibold text-white">
                Name
              </th>
              <td className="border border-[#222] px-3 py-1.5" colSpan={3}>
                <Hand>Reazul Islam Reaz</Hand>
              </td>
              <th className="w-[6%] border border-[#222] bg-[#317d5f] px-2 py-1.5 text-center text-[12px] font-semibold text-white">
                ID
              </th>
              <td className="w-[14%] border border-[#222] px-3 py-1.5 text-center">
                <Hand>20484</Hand>
              </td>
            </tr>
            <tr>
              <th className="border border-[#222] bg-[#317d5f] px-2 py-1 text-center text-[11px] font-semibold text-white">
                Designation
              </th>
              <th className="border border-[#222] bg-[#317d5f] px-2 py-1 text-center text-[11px] font-semibold text-white">
                Team Name
              </th>
              <th
                className="border border-[#222] bg-[#317d5f] px-2 py-1 text-center text-[11px] font-semibold text-white"
                colSpan={2}
              >
                Department Name
              </th>
              <th className="border border-[#222] bg-[#317d5f] px-1 py-1 text-center text-[11px] font-semibold text-white">
                Day
              </th>
              <th className="border border-[#222] bg-[#317d5f] px-1 py-1 text-center text-[11px] font-semibold text-white">
                Night
              </th>
            </tr>
            <tr>
              <td className="border border-[#222] px-3 py-2">
                <Hand className="text-[1.2rem]">Full Stack Developer</Hand>
              </td>
              <td className="border border-[#222] px-3 py-2">
                <Hand>Nano Devs</Hand>
              </td>
              <td className="border border-[#222] px-3 py-2" colSpan={2}>
                <Hand>Quantum Alliance</Hand>
              </td>
              <td className="border border-[#222] py-2 text-center">
                <Check checked />
              </td>
              <td className="border border-[#222] py-2 text-center">
                <Check />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Reason + People Desk Records */}
        <div className="mt-0 grid grid-cols-1 border border-t-0 border-[#222] md:grid-cols-[1fr_240px]">
          <div className="min-h-[150px] border-b border-[#222] px-3 py-2 md:border-r md:border-b-0">
            <p className="text-[12px] font-medium">For the following reason(s):</p>
            <p className={`${hand.className} mt-3 max-w-[34rem] text-[1.45rem] leading-snug text-[#1a1a1a]`}>
              I have my honours exam on november 9th. So, I&apos;ll need to take leave that day.
            </p>
          </div>
          <div className="px-0 py-0">
            <p className="border-b border-[#222] px-2 py-1.5 text-center text-[12px] font-semibold">
              People Desk Records
            </p>
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {[
                  ['Casual Leave [CL]', '01'],
                  ['Sick Leave [SL]', '02'],
                  ['Earn Leave [EL]', '11'],
                  ['Total', '14'],
                ].map(([label, value], i, arr) => (
                  <tr key={label}>
                    <td
                      className={`border-r border-[#222] px-2 py-1.5 ${i < arr.length - 1 ? 'border-b border-[#222]' : ''} ${label === 'Total' ? 'font-semibold' : ''}`}
                    >
                      {label}
                    </td>
                    <td
                      className={`w-12 px-1 py-1.5 text-center ${i < arr.length - 1 ? 'border-b border-[#222]' : ''}`}
                    >
                      <Hand className="text-[1.25rem]">{value}</Hand>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave dates */}
        <table className="mt-4 w-full border-collapse border border-[#222]">
          <thead>
            <tr>
              <th className="w-[46%] border border-[#222] bg-[#317d5f] px-2 py-1.5 text-center text-[12px] font-semibold text-white">
                Leave
              </th>
              <th className="w-[18%] border border-[#222] bg-[#317d5f] px-2 py-1.5 text-center text-[12px] font-semibold text-white">
                From Date
              </th>
              <th className="w-[18%] border border-[#222] bg-[#317d5f] px-2 py-1.5 text-center text-[12px] font-semibold text-white">
                End Date
              </th>
              <th className="w-[18%] border border-[#222] bg-[#317d5f] px-2 py-1.5 text-center text-[12px] font-semibold text-white">
                Total Leave Days
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#222] px-2 py-3 text-center text-[11px] leading-snug text-[#317d5f]">
                Casual Leave/Sick Leave/Earn Leave/Leave Without Pay
              </td>
              <td className="border border-[#222] px-2 py-3 text-center">
                <Hand>09-11-2026</Hand>
              </td>
              <td className="border border-[#222] px-2 py-3 text-center">
                <Hand>09-11-2026</Hand>
              </td>
              <td className="border border-[#222] px-2 py-3 text-center">
                <Hand className="text-[1.6rem]">1</Hand>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Approvals */}
        <table className="mt-4 w-full border-collapse border border-[#222]">
          <thead>
            <tr>
              {APPROVALS.map((col) => (
                <th
                  key={col.title}
                  className="border border-[#222] px-1 py-2 text-center align-top text-[12px] font-bold text-[#317d5f]"
                >
                  <div>{col.title}</div>
                  {'people' in col && col.people ? (
                    <div className="mt-1 flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 text-[9px] font-normal text-black">
                      {col.people.map((name) => (
                        <span key={name} className="inline-flex items-center gap-0.5">
                          {name} <Check />
                        </span>
                      ))}
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {APPROVALS.map((col) => (
                <td key={`${col.title}-status`} className="border border-[#222] px-2 py-2 align-top text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span>Approved</span>
                    <Check checked={col.approved} />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span>Rejected</span>
                    <Check checked={col.rejected} />
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              {APPROVALS.map((col) => (
                <td
                  key={`${col.title}-sig`}
                  className="h-[100px] border border-[#222] px-2 py-1.5 align-top text-[11px]"
                >
                  <div className="flex h-full min-h-[88px] flex-col">
                    <p className="font-medium">Signature/Name:</p>
                    <div className="flex flex-1 items-center justify-center">
                      {col.signature ? (
                        <p className={`${hand.className} text-center text-[1.55rem] leading-none`}>
                          {col.signature}
                        </p>
                      ) : null}
                    </div>
                    <p>
                      Date:{' '}
                      {col.date ? <Hand className="text-[1.15rem]">{col.date}</Hand> : null}
                    </p>
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={5} className="h-[72px] border border-[#222] px-2 py-1.5 align-top text-[11px]">
                <span className="font-medium">Remarks:</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* How to submit */}
        <section className="mt-6 text-[#b0100d]">
          <h2 className="text-[13px] font-bold tracking-wide uppercase sm:text-[14px]">
            How to Submit Leave Permission
          </h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[12px] leading-relaxed sm:text-[13px]">
            <li>
              The employee has to submit the leave application form at least{' '}
              <strong className="font-bold">01 day</strong> before the leave is taken.
            </li>
            <li>
              Leave application must be verified by <strong className="font-bold">HR</strong>.
            </li>
            <li>
              A verified application will be taken to the direct{' '}
              <strong className="font-bold">superior</strong>.
            </li>
          </ol>
        </section>
      </article>
    </div>
  );
}
