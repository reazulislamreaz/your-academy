import { redirect } from 'next/navigation';

type Props = { params: Promise<{ batchId: string }> };

/** Legacy prepare/browse hub → Learning Preli Questions set view. */
export default async function PreliminaryBatchLegacyRedirect({ params }: Props) {
  const { batchId } = await params;
  redirect(`/preli-questions/${encodeURIComponent(batchId)}`);
}
