'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';
import { getCookie } from '@/lib/utils';

export const meQueryKey = ['me'] as const;

/** CSRF cookie is readable and set only while an auth session exists (DEC-012). */
function hasAuthSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token'));
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiFetch<MeUser>('/users/me'),
    enabled: hasAuthSessionHint(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    onSettled: async () => {
      qc.setQueryData(meQueryKey, null);
      await qc.invalidateQueries({ queryKey: meQueryKey });
      qc.removeQueries({ queryKey: ['questions'] });
      qc.removeQueries({ queryKey: ['bookmarks'] });
      qc.removeQueries({ queryKey: ['documents'] });
      qc.removeQueries({ queryKey: ['admin-dashboard'] });
      router.push('/');
      router.refresh();
    },
  });
}

export function useIsAdmin() {
  const me = useMe();
  return me.data?.role === 'ADMIN';
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}
