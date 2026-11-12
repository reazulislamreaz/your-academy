import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
type UserStatus = 'ACTIVE' | 'SUSPENDED' | string;

const publishVariant: Record<string, 'highlight' | 'success' | 'outline' | 'default'> = {
  DRAFT: 'highlight',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
};

/** Compact status chip for content lifecycle. */
export function AdminPublishStatus({
  status,
  className,
}: {
  status: PublishStatus;
  className?: string;
}) {
  const label =
    status === 'DRAFT'
      ? 'Draft'
      : status === 'PUBLISHED'
        ? 'Published'
        : status === 'ARCHIVED'
          ? 'Archived'
          : status;
  return (
    <Badge variant={publishVariant[status] ?? 'default'} className={cn('capitalize', className)}>
      {label}
    </Badge>
  );
}

/** Account status chip. */
export function AdminUserStatus({
  status,
  className,
}: {
  status: UserStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'danger' : 'outline'}
      className={className}
    >
      {status === 'ACTIVE' ? 'Active' : status === 'SUSPENDED' ? 'Suspended' : status}
    </Badge>
  );
}

/** Boolean published chip for news/docs. */
export function AdminPublishedFlag({
  published,
  className,
}: {
  published: boolean;
  className?: string;
}) {
  return (
    <Badge variant={published ? 'success' : 'outline'} className={className}>
      {published ? 'Published' : 'Draft'}
    </Badge>
  );
}
