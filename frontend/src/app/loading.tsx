import { GlobalLoader } from '@/components/loading';

/** Root Suspense fallback — first paint / hard navigations only. */
export default function RootLoading() {
  return <GlobalLoader />;
}
