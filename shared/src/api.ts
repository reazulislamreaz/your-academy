export interface ApiPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  limit: number;
  total: number | null;
}

export interface ApiMeta {
  requestId: string;
  pagination?: ApiPaginationMeta;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface HealthData {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
}

export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  pagination?: ApiPaginationMeta,
): ApiSuccess<T> {
  return {
    success: true,
    data,
    meta: pagination ? { requestId, pagination } : { requestId },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details: unknown[] = [],
): ApiErrorBody {
  return {
    success: false,
    error: { code, message, details },
    meta: { requestId },
  };
}
