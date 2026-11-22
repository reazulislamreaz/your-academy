import { redirect } from 'next/navigation';

type Props = { params: Promise<{ batchId: string }> };

/** Legacy result URL → Practice Preli Practice result. */
export default async function PreliminaryResultLegacyRedirect({ params }: Props) {
  const { batchId } = await params;
  redirect(`/preli-practice/${encodeURIComponent(batchId)}/result`);
}
