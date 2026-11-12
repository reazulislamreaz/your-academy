'use client';

import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { apiFetchResult, type ApiResult } from '@/lib/api/client';

type CursorPage<T> = ApiResult<T[]>;

/**
 * Cursor infinite list against `/api/v1` envelopes that expose `meta.pagination.nextCursor`.
 * Use `isLoading` (not `isFetching`) for full-list skeletons.
 */
export function useCursorList<TItem>(
  queryKey: QueryKey,
  buildPath: (cursor: string | undefined) => string,
  options?: Omit<
    UseInfiniteQueryOptions<
      CursorPage<TItem>,
      Error,
      InfiniteData<CursorPage<TItem>>,
      QueryKey,
      string | undefined
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >,
) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => apiFetchResult<TItem[]>(buildPath(pageParam)),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    ...options,
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    ...query,
    items,
    hasNextPage: Boolean(query.hasNextPage),
  };
}
