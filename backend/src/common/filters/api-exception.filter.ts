import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { Response } from 'express';
import { newRequestId } from '../request-id';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = newRequestId();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null && 'success' in payload) {
        response.status(status).json(payload);
        return;
      }

      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ?? exception.message);
      const normalized = Array.isArray(message) ? message.join(', ') : String(message);
      const code =
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof (payload as { error?: { code?: string } }).error?.code === 'string'
          ? (payload as { error: { code: string } }).error.code
          : httpCodeToErrorCode(status);

      response.status(status).json(createErrorResponse(code, normalized, requestId));
      return;
    }

    this.logger.error(exception);

    const mapped = mapUnknownException(exception);
    response
      .status(mapped.status)
      .json(createErrorResponse(mapped.code, mapped.message, requestId));
  }
}

function httpCodeToErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'HTTP_ERROR';
  }
}

/** Map raw Node / Multer failures to actionable API errors (no stack traces to clients). */
function mapUnknownException(exception: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const err = exception as NodeJS.ErrnoException & { code?: string; message?: string };
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : '';

  if (code === 'EACCES' || /EACCES|permission denied/i.test(message)) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'STORAGE_PERMISSION_DENIED',
      message:
        'Server cannot write upload files (permission denied). Fix storage folder permissions and retry.',
    };
  }
  if (code === 'ENOSPC' || /ENOSPC|no space left/i.test(message)) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'STORAGE_FULL',
      message: 'Server disk is full. Free space and retry the upload.',
    };
  }
  if (code === 'LIMIT_FILE_SIZE' || /File too large/i.test(message)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'FILE_TOO_LARGE',
      message: 'File must be 15MB or smaller',
    };
  }
  if (code === 'LIMIT_UNEXPECTED_FILE' || /Unexpected field/i.test(message)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'INVALID_UPLOAD_FIELD',
      message: 'Upload field must be named "file"',
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error. If this keeps happening, contact support with the request id.',
  };
}
