import { ListCardSkeleton } from '@/components/loading';

/** Marketing route transition — list-shaped skeleton inside the page shell. */
export default function MarketingLoading() {
  return (
    <div className="marketing-container py-10 sm:py-12">
      <div className="mb-6 space-y-2">
        <div className="h-3 w-16 rounded bg-[var(--line)]" aria-hidden />
        <div className="h-8 w-56 max-w-full rounded bg-[var(--line)]" aria-hidden />
        <div className="h-4 w-full max-w-md rounded bg-[var(--line)]" aria-hidden />
      </div>
      <ListCardSkeleton rows={5} />
    </div>
  );
}
