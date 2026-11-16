import { HomePageSkeleton } from '@/components/skeletons';

/** In-shell route transition — content-shaped, not a full-screen BrandPulse. */
export default function AppLoading() {
  return (
    <div className="p-4 sm:p-6">
      <HomePageSkeleton />
    </div>
  );
}
