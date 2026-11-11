import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { SkButton, SkLine, SkStatus, SkTitle } from '@/components/skeletons/primitives';

function AuthFormShell({
  label,
  titleWidth,
  fields,
}: {
  label: string;
  titleWidth: string;
  fields: number;
}) {
  return (
    <SkStatus label={label} className="space-y-6">
      <div>
        <SkTitle className={titleWidth} />
        <SkLine className="mt-2 h-4 w-full max-w-sm" />
      </div>
      <Surface className="space-y-4 p-6 sm:p-7">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkLine className="h-3.5 w-28" />
            <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
          </div>
        ))}
        <SkButton className="w-full" />
      </Surface>
      <SkLine className="h-4 w-48" />
    </SkStatus>
  );
}

export function LoginPageSkeleton() {
  return <AuthFormShell label="Loading sign in…" titleWidth="w-56" fields={2} />;
}

export function RegisterPageSkeleton() {
  return <AuthFormShell label="Loading registration…" titleWidth="w-64" fields={3} />;
}

export function ForgotPasswordPageSkeleton() {
  return <AuthFormShell label="Loading password recovery…" titleWidth="w-72" fields={1} />;
}

export function ResetPasswordPageSkeleton() {
  return <AuthFormShell label="Loading password reset…" titleWidth="w-64" fields={2} />;
}
