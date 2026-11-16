import { LoginPageSkeleton } from '@/components/skeletons';

/** Auth route transition — form-shaped skeleton. */
export default function AuthLoading() {
  return (
    <div className="w-full max-w-md px-4 py-8 sm:px-0">
      <LoginPageSkeleton />
    </div>
  );
}
