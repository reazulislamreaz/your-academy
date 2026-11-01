export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    pagination?: {
      nextCursor: string | null;
      prevCursor: string | null;
      limit: number;
      total: number | null;
    };
  };
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
  meta: {
    requestId: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface HealthData {
  status: 'ok';
  service: string;
  timestamp: string;
}
