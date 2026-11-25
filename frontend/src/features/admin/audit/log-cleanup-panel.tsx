'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AdminSection } from '@/components/admin/admin-page';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PurgePreview, PurgeRequest } from '@/lib/api/admin-activity-types';

const startOfDay = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const endOfDay = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

/**
 * DEC-067 — permanently delete old audit / activity logs. Always: preview count → typed
 * DELETE confirmation → server re-checks Admin role and writes a CRITICAL purge record
 * (which no later purge removes).
 */
export function LogCleanupPanel() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<PurgeRequest['target']>('all');
  const [mode, setMode] = useState<PurgeRequest['mode']>('retention');
  const [before, setBefore] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<PurgePreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  const request = (): PurgeRequest => ({
    target,
    mode,
    ...(mode === 'before' && before ? { before: startOfDay(before) } : {}),
    ...(mode === 'range' && from && to ? { from: startOfDay(from), to: endOfDay(to) } : {}),
  });
  const ready = mode === 'retention' || (mode === 'before' ? Boolean(before) : Boolean(from && to));
  const resetPreview = () => setPreview(null);
  const errorText = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message : fallback;

  const previewQ = useMutation({
    mutationFn: () =>
      apiFetch<PurgePreview>('/admin/logs/purge/preview', {
        method: 'POST',
        body: JSON.stringify(request()),
      }),
    onSuccess: (data) => {
      setPreview(data);
      setMessage(null);
    },
    onError: (err) => setMessage({ kind: 'danger', text: errorText(err, 'Preview failed') }),
  });

  const purge = useMutation({
    mutationFn: () =>
      apiFetch<{ deleted: { audit: number; activity: number; total: number } }>(
        '/admin/logs/purge',
        { method: 'POST', body: JSON.stringify({ ...request(), confirm: typed }) },
      ),
    onSuccess: (data) => {
      setConfirmOpen(false);
      setTyped('');
      setPreview(null);
      setMessage({
        kind: 'success',
        text: `Deleted ${data.deleted.total} record(s): ${data.deleted.audit} audit, ${data.deleted.activity} activity. The purge itself was recorded in the audit log.`,
      });
      void qc.invalidateQueries({ queryKey: ['admin-audit'] });
      void qc.invalidateQueries({ queryKey: ['admin-activity-events'] });
    },
    onError: (err) => setMessage({ kind: 'danger', text: errorText(err, 'Delete failed') }),
  });

  return (
    <AdminSection
      title="Data management — log cleanup"
      description="Permanently delete old audit and activity records. Preview the count first; deletion cannot be undone."
    >
      <Surface className="space-y-4 p-3.5 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <Label htmlFor="purge-target">Logs</Label>
            <Select
              id="purge-target"
              className="h-10"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value as PurgeRequest['target']);
                resetPreview();
              }}
            >
              <option value="all">Audit + activity</option>
              <option value="audit">Audit log only</option>
              <option value="activity">Activity feed only</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="purge-mode">Delete</Label>
            <Select
              id="purge-mode"
              className="h-10"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as PurgeRequest['mode']);
                resetPreview();
              }}
            >
              <option value="retention">Older than 90 days</option>
              <option value="before">Everything before a date</option>
              <option value="range">A date range</option>
            </Select>
          </Field>
          {mode === 'before' ? (
            <Field>
              <Label htmlFor="purge-before">Before</Label>
              <Input
                id="purge-before"
                type="date"
                className="h-10"
                value={before}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setBefore(e.target.value);
                  resetPreview();
                }}
              />
            </Field>
          ) : null}
          {mode === 'range' ? (
            <>
              <Field>
                <Label htmlFor="purge-from">From</Label>
                <Input
                  id="purge-from"
                  type="date"
                  className="h-10"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    resetPreview();
                  }}
                />
              </Field>
              <Field>
                <Label htmlFor="purge-to">To (inclusive)</Label>
                <Input
                  id="purge-to"
                  type="date"
                  className="h-10"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    resetPreview();
                  }}
                />
              </Field>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={!ready || previewQ.isPending}
            loading={previewQ.isPending}
            onClick={() => previewQ.mutate()}
          >
            Preview count
          </Button>
          <Button
            variant="danger"
            className="gap-1.5"
            disabled={!preview || preview.counts.total === 0}
            onClick={() => {
              setTyped('');
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete permanently
          </Button>
        </div>

        {preview ? (
          <Alert variant={preview.counts.total ? 'warning' : 'info'}>
            {preview.counts.total
              ? `${preview.counts.total} record(s) match (${preview.counts.audit} audit, ${preview.counts.activity} activity) — ${preview.criteria.summary}.`
              : `Nothing to delete — ${preview.criteria.summary}.`}
          </Alert>
        ) : null}
        {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}
      </Surface>

      <FormDialog
        open={confirmOpen}
        title="Permanently delete logs?"
        description={
          preview
            ? `${preview.counts.total} record(s) will be removed from the database (${preview.criteria.summary}). This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete permanently"
        pending={purge.isPending}
        error={null}
        disableSubmit={typed !== 'DELETE'}
        onSubmit={() => purge.mutate()}
        onClose={() => setConfirmOpen(false)}
      >
        <Field>
          <Label htmlFor="purge-confirm">Type DELETE to confirm</Label>
          <Input
            id="purge-confirm"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
          />
          <FieldHint>
            Your name, the criteria and the counts are written to the audit log.
          </FieldHint>
        </Field>
      </FormDialog>
    </AdminSection>
  );
}
