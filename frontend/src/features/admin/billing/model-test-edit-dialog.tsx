'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type {
  AdminModelTestListItem,
  ContentAccessLevel,
  ModelTestCategoryRef,
} from '@your-academy/shared';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { updateAdminModelTest } from '@/lib/api/model-tests';
import { errorMessage } from './billing-format';
import { ContentAccessToggle } from './content-access-toggle';

/** Edit a Model Test's metadata, including the DEC-060 Free / Paid toggle. */
export function ModelTestEditDialog({
  item,
  categories,
  onClose,
}: {
  item: AdminModelTestListItem | null;
  categories: ModelTestCategoryRef[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [examYear, setExamYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [access, setAccess] = useState<ContentAccessLevel>('FREE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDuration(String(item.durationInMinutes));
    setExamYear(item.examYear != null ? String(item.examYear) : '');
    setCategoryId(item.category?.id ?? '');
    setAccess(item.access ?? 'FREE');
    setError(null);
  }, [item]);

  const save = useMutation({
    mutationFn: () =>
      updateAdminModelTest(item!.id, {
        title: title.trim(),
        durationInMinutes: Number(duration),
        examYear: examYear.trim() ? Number(examYear) : null,
        categoryId: categoryId || null,
        access,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-model-tests'] });
      onClose();
    },
    onError: (err) => setError(errorMessage(err, 'Could not save the model test')),
  });

  const durationOk = /^\d{1,4}$/.test(duration.trim()) && Number(duration) >= 1;
  const yearOk = !examYear.trim() || /^\d{4}$/.test(examYear.trim());
  const valid = title.trim().length > 0 && durationOk && yearOk;

  return (
    <FormDialog
      open={Boolean(item)}
      title="Edit Model Test"
      confirmLabel="Save changes"
      pending={save.isPending}
      error={error}
      disableSubmit={!valid}
      onSubmit={() => save.mutate()}
      onClose={() => {
        if (!save.isPending) onClose();
      }}
    >
      <Field>
        <Label htmlFor="mt-edit-title">Title</Label>
        <Input
          id="mt-edit-title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="mt-edit-duration">Duration (minutes)</Label>
          <Input
            id="mt-edit-duration"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="mt-edit-year">Exam year</Label>
          <Input
            id="mt-edit-year"
            inputMode="numeric"
            value={examYear}
            placeholder="Optional"
            onChange={(e) => setExamYear(e.target.value)}
          />
        </Field>
      </div>
      <Field>
        <Label htmlFor="mt-edit-category">Category</Label>
        <Select
          id="mt-edit-category"
          className="h-10"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor="mt-edit-access">Access</Label>
        <ContentAccessToggle id="mt-edit-access" value={access} onChange={setAccess} />
        <FieldHint>Paid tests are locked for free users while the paid system is ON.</FieldHint>
      </Field>
    </FormDialog>
  );
}
