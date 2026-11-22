import { redirect } from 'next/navigation';

type Props = { params: Promise<{ batchId: string }> };

/** Legacy take URL → Practice Preli Practice take. */
export default async function PreliminaryTakeLegacyRedirect({ params }: Props) {
  const { batchId } = await params;
  redirect(`/preli-practice/${encodeURIComponent(batchId)}/take`);
}
