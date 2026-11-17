import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Preli Question Bank — Your Academy',
  description:
    'Browse published preliminary MCQ collections for BCS, Bank, NTRCA, and government job exams. Filter by subcategory and year.',
};

export default function PreliQuestionBankLayout({ children }: { children: ReactNode }) {
  return children;
}
