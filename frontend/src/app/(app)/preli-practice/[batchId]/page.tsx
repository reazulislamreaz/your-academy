'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { PreliPracticeStartModal } from '@/features/preli-practice/preli-practice-start-modal';
import { savePreliPracticeSession } from '@/features/preli-practice/preli-practice-session';
import { ApiError } from '@/lib/api/client';
import { getPublicQuestionSet } from '@/lib/api/public-questions';

/** Practice retake / prepare hub — opens the time modal for a Preli set. */
export default function PreliPracticePreparePage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [starting, setStarting] = useState(false);

  const setQry = useQuery({
    queryKey: ['public-question-set', batchId],
    queryFn: () => getPublicQuestionSet(batchId),
    enabled: Boolean(batchId),
  });

  useEffect(() => {
    setOpen(true);
  }, [batchId]);

  if (setQry.isError) {
    return (
      <LearnerPage dense>
        <Alert variant="danger">
          {setQry.error instanceof ApiError ? setQry.error.message : 'Question set not found.'}{' '}
          <Link href="/preli-practice" className="font-semibold underline-offset-2 hover:underline">
            Back to Preli Practice
          </Link>
        </Alert>
      </LearnerPage>
    );
  }

  const set = setQry.data;

  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Practice"
        title={set?.title ?? 'Loading set…'}
        description="Set your exam time, then start. You stay signed in — no name entry."
        actions={
          <Link href="/preli-practice">
            <Button variant="outline" size="sm">
              All sets
            </Button>
          </Link>
        }
      />

      <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5">
        <p className="text-sm text-[var(--muted-strong)]">
          {setQry.isLoading ? (
            'Loading question count…'
          ) : (
            <>
              This set has{' '}
              <strong className="tabular-nums text-[var(--ink)]">{set?.questionCount ?? 0}</strong>{' '}
              MCQ{(set?.questionCount ?? 0) === 1 ? '' : 's'}.
            </>
          )}
        </p>
        <Button
          type="button"
          className="min-h-11"
          disabled={setQry.isLoading || !set}
          onClick={() => setOpen(true)}
        >
          Choose time & start
        </Button>
      </Surface>

      {set ? (
        <PreliPracticeStartModal
          open={open}
          setTitle={set.title}
          questionCount={set.questionCount}
          pending={starting}
          onClose={() => {
            if (!starting) setOpen(false);
          }}
          onStart={(durationMinutes) => {
            setStarting(true);
            savePreliPracticeSession({
              setId: set.id,
              setTitle: set.title,
              durationMinutes,
              startedAtMs: Date.now(),
              answers: {},
            });
            router.push(`/preli-practice/${encodeURIComponent(set.id)}/take`);
          }}
        />
      ) : null}
    </LearnerPage>
  );
}
