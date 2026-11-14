'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { ComponentType, SVGProps } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BanglaBookIcon,
  BankTempleIcon,
  BcsEmblemIcon,
  EnglishLangIcon,
  GearBlueIcon,
  GkGlobeIcon,
  GovSealIcon,
  GradCapIcon,
  MathSymbolsIcon,
} from '@/components/marketing/homepage-icons';
import { Reveal } from '@/components/motion/reveal';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

const CATEGORY_TILES: Array<{
  name: string;
  match: string[];
  subtitle: string;
  Icon: IconComp;
  fallbackHref: string;
}> = [
  {
    name: 'BCS',
    match: ['bcs', 'বিসিএস'],
    subtitle: '(Preliminary + Written)',
    Icon: BcsEmblemIcon,
    fallbackHref: '/preli-question-bank?q=BCS',
  },
  {
    name: 'Bank',
    match: ['bank', 'ব্যাংক'],
    subtitle: '(Officer & SO)',
    Icon: BankTempleIcon,
    fallbackHref: '/preli-question-bank?q=Bank',
  },
  {
    name: 'Government Jobs',
    match: ['government', 'govt', 'সরকারি'],
    subtitle: '',
    Icon: GovSealIcon,
    fallbackHref: '/preli-question-bank?q=Government',
  },
  {
    name: 'Primary & NTRCA',
    match: ['ntrca', 'primary', 'প্রাথমিক'],
    subtitle: '',
    Icon: GradCapIcon,
    fallbackHref: '/preli-question-bank?q=NTRCA',
  },
  {
    name: 'Other Govt. Jobs',
    match: ['other', 'অন্যান্য'],
    subtitle: '',
    Icon: GearBlueIcon,
    fallbackHref: '/preli-question-bank',
  },
];

const TOPIC_TILES: Array<{
  name: string;
  match: string[];
  Icon: IconComp;
  fallbackHref: string;
}> = [
  {
    name: 'Bangla',
    match: ['bangla', 'বাংলা'],
    Icon: BanglaBookIcon,
    fallbackHref: '/preli-question-bank?q=Bangla',
  },
  {
    name: 'English',
    match: ['english', 'ইংরেজি'],
    Icon: EnglishLangIcon,
    fallbackHref: '/preli-question-bank?q=English',
  },
  {
    name: 'Math',
    match: ['math', 'গণিত'],
    Icon: MathSymbolsIcon,
    fallbackHref: '/preli-question-bank?q=Math',
  },
  {
    name: 'GK',
    match: ['gk', 'সাধারণ জ্ঞান', 'general knowledge'],
    Icon: GkGlobeIcon,
    fallbackHref: '/preli-question-bank?q=GK',
  },
  {
    name: 'Others',
    match: ['others', 'other', 'অন্যান্য'],
    Icon: GearBlueIcon,
    fallbackHref: '/preli-question-bank',
  },
];

function norm(s: string) {
  return s.normalize('NFC').trim().toLowerCase();
}

function findRoot(categories: CategoryNode[], needles: string[]): CategoryNode | undefined {
  return categories.find((c) => {
    const n = norm(c.name);
    return needles.some((m) => n === m || n.includes(m));
  });
}

function findSubcategory(
  categories: CategoryNode[],
  needles: string[],
): { categoryId: string; subcategoryId: string } | undefined {
  for (const root of categories) {
    for (const child of root.children) {
      const n = norm(child.name);
      if (needles.some((m) => n === m || n.includes(m))) {
        return { categoryId: root.id, subcategoryId: child.id };
      }
    }
  }
  return undefined;
}

/** Homepage exam + topic tiles resolve to real category/subcategory placement filters when possible. */
export function HomepageBankBrowse() {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const roots = categories.data ?? [];

  return (
    <>
      <section className="section-pad">
        <Reveal className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
          <div className="space-y-4">
            <span
              className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
              aria-hidden
            />
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
              Our Question Bank Categories
            </h2>
            <p className="text-[var(--muted-strong)]">
              Choose your target exam and start your preparation
            </p>
            <Link href="/preli-question-bank" className="inline-flex pt-1">
              <Button className="rounded-full px-6 shadow-sm">
                View All Exams
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {CATEGORY_TILES.map(({ name, match, subtitle, Icon, fallbackHref }) => {
              const root = findRoot(roots, match);
              const href = root
                ? `/preli-question-bank?categoryId=${encodeURIComponent(root.id)}`
                : fallbackHref;
              return (
                <li key={name}>
                  <Link
                    href={href}
                    className="motion-hover-lift ya-panel-shine relative group flex h-full flex-col items-center gap-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/50"
                  >
                    <Icon className="relative z-[1] h-12 w-12" />
                    <span className="relative z-[1]">
                      <span className="block font-display text-sm leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
                        {name}
                      </span>
                      {subtitle ? (
                        <span className="mt-0.5 block text-xs leading-snug text-[var(--muted-strong)]">
                          {subtitle}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </section>

      <section className="pb-[var(--space-section)]">
        <Reveal className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
          <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--info-soft)] px-5 py-7 shadow-[var(--shadow-sm)] sm:px-8 sm:py-8">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
              <div className="space-y-4">
                <span
                  className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                  aria-hidden
                />
                <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                  Topic Base Question Analysis
                </h2>
                <Link href="/preli-question-bank" className="inline-flex pt-1">
                  <Button className="rounded-full px-6 shadow-sm">
                    View All Topics
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                {TOPIC_TILES.map(({ name, match, Icon, fallbackHref }) => {
                  const hit = findSubcategory(roots, match);
                  const href = hit
                    ? `/preli-question-bank?categoryId=${encodeURIComponent(hit.categoryId)}&subcategoryId=${encodeURIComponent(hit.subcategoryId)}`
                    : fallbackHref;
                  return (
                    <li key={name}>
                      <Link
                        href={href}
                        className="motion-hover-lift ya-panel-shine relative group flex h-full flex-col items-center gap-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/50"
                      >
                        <Icon className="relative z-[1] h-12 w-12" />
                        <span className="relative z-[1] font-display text-sm font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
                          {name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
