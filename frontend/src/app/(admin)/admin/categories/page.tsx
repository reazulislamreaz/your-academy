'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { AdminCategoriesPageSkeleton } from '@/components/skeletons';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug || slugify(name),
          description: description || undefined,
          parentId: parentId || undefined,
        }),
      }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setDescription('');
      setParentId('');
      setMsg('Category created');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      setMsg(null);
      setError(err instanceof ApiError ? err.message : 'Create failed');
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Taxonomy"
        title="Categories"
        description="Two-level tree for the question bank and documents."
      />

      <Surface className="p-6">
        <h2 className="font-display text-lg font-semibold">Add category</h2>
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="parent">Parent (optional subcategory)</Label>
            <Select
              id="parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">Root category</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          {error ? <Alert className="md:col-span-2" variant="danger">{error}</Alert> : null}
          {msg ? <Alert className="md:col-span-2" variant="success">{msg}</Alert> : null}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </form>
      </Surface>

      {categories.isLoading ? <AdminCategoriesPageSkeleton omitHeader /> : null}

      <div className="space-y-4">
        {categories.data?.map((root) => (
          <Surface key={root.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{root.name}</h3>
                <p className="text-sm text-[var(--muted-strong)]">{root.slug}</p>
                {root.description ? (
                  <p className="mt-2 text-sm text-[var(--muted-strong)]">{root.description}</p>
                ) : null}
              </div>
              <ConfirmButton
                size="sm"
                variant="ghost"
                confirmMessage={`Deactivate “${root.name}”?`}
                onConfirm={() => deactivate.mutateAsync(root.id)}
              >
                Deactivate
              </ConfirmButton>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {root.children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-1.5 text-sm"
                >
                  <span>{child.name}</span>
                  <Badge variant="outline">{child.slug}</Badge>
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Deactivate ${child.name}`}
                    confirmMessage={`Deactivate “${child.name}”?`}
                    onConfirm={() => deactivate.mutateAsync(child.id)}
                  >
                    ×
                  </ConfirmButton>
                </div>
              ))}
              {root.children.length === 0 ? (
                <p className="text-sm text-[var(--muted-strong)]">No subcategories</p>
              ) : null}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
