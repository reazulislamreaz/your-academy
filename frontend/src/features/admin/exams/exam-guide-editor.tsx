'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_EXAM_GUIDE_ITEMS,
  DEFAULT_EXAM_GUIDE_TITLE,
  type ExamGuideItem,
} from '@your-academy/shared';
import { AdminFormPanel } from '@/components/admin/admin-page';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import { getAdminExamGuide, updateAdminExamGuide } from '@/lib/api/exams';
import { revalidateExamsCache } from '@/lib/api/revalidate-exams';

function newItemId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `quiz-guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ExamGuideEditor() {
  const qc = useQueryClient();
  const [title, setTitle] = useState(DEFAULT_EXAM_GUIDE_TITLE);
  const [items, setItems] = useState<ExamGuideItem[]>(
    DEFAULT_EXAM_GUIDE_ITEMS.map((item) => ({ ...item })),
  );
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  const guide = useQuery({
    queryKey: ['admin-exam-guide'],
    queryFn: getAdminExamGuide,
  });

  useEffect(() => {
    if (!guide.data || hydrated) return;
    setTitle(guide.data.title || DEFAULT_EXAM_GUIDE_TITLE);
    setItems(
      guide.data.items.length > 0
        ? guide.data.items.map((item) => ({ ...item }))
        : [],
    );
    setHydrated(true);
  }, [guide.data, hydrated]);

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = items
        .map((item) => ({
          id: item.id.trim() || newItemId(),
          text: item.text.trim(),
        }))
        .filter((item) => item.text.length > 0);

      const saved = await updateAdminExamGuide({
        title: title.trim(),
        items: cleaned,
      });
      const revalidate = await revalidateExamsCache();
      return { saved, revalidate };
    },
    onSuccess: ({ saved, revalidate }) => {
      setTitle(saved.title);
      setItems(saved.items.map((item) => ({ ...item })));
      void qc.invalidateQueries({ queryKey: ['admin-exam-guide'] });
      void qc.invalidateQueries({ queryKey: ['public-exam-guide'] });
      setFeedback({
        kind: 'ok',
        text: revalidate.ok
          ? 'Guide saved. /exams will show the update immediately.'
          : `Guide saved. Cache refresh note: ${revalidate.detail ?? 'skipped'}`,
      });
    },
    onError: (err) => {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Could not save guide',
      });
    },
  });

  function updateItem(index: number, text: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { id: newItemId(), text: '' }]);
  }

  return (
    <AdminFormPanel title="Listing guide (কুইজ কীভাবে দিবেন)">
      <div className="grid gap-4">
        <p className="text-xs text-[var(--muted-strong)]">
          Edits appear on the public <code className="text-[0.7rem]">/exams</code> sidebar.
          Empty step list hides the numbered instructions (title still shows).
        </p>

        {guide.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading guide…</p>
        ) : guide.isError ? (
          <Alert variant="danger">Could not load guide. Try refreshing.</Alert>
        ) : (
          <>
            <Field>
              <Label htmlFor="quiz-guide-title">Section title</Label>
              <Input
                id="quiz-guide-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder={DEFAULT_EXAM_GUIDE_TITLE}
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-3.5" aria-hidden />
                  Add step
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="rounded-[var(--radius)] border border-dashed border-[var(--line)] px-3 py-4 text-center text-sm text-[var(--muted)]">
                  No steps yet. Add one, or save to show title only.
                </p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item, index) => (
                    <li
                      key={item.id}
                      className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--muted-strong)]">
                          Step {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={index === 0}
                            aria-label="Move up"
                            onClick={() => moveItem(index, -1)}
                          >
                            <ArrowUp className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={index === items.length - 1}
                            aria-label="Move down"
                            onClick={() => moveItem(index, 1)}
                          >
                            <ArrowDown className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[var(--danger)]"
                            aria-label="Delete step"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={item.text}
                        onChange={(e) => updateItem(index, e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Instruction text (Bangla OK)"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {feedback ? (
              <Alert variant={feedback.kind === 'ok' ? 'success' : 'danger'}>
                {feedback.text}
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={save.isPending || !title.trim()}
                onClick={() => {
                  setFeedback(null);
                  save.mutate();
                }}
              >
                {save.isPending ? 'Saving…' : 'Save guide'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => {
                  setTitle(DEFAULT_EXAM_GUIDE_TITLE);
                  setItems(DEFAULT_EXAM_GUIDE_ITEMS.map((item) => ({ ...item })));
                  setFeedback(null);
                }}
              >
                Reset to defaults
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminFormPanel>
  );
}
