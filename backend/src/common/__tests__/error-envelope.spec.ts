import {
  BadRequestException,
  HttpStatus,
  PayloadTooLargeException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiExceptionFilter, fileTooLargeMessage } from '../filters/api-exception.filter';
import { validationExceptionFactory } from '../validation-exception';

class RegisterLike {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;
}

function host(req: Record<string, unknown>) {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  return {
    res,
    host: { switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }) } as never,
  };
}

describe('ERR-3 validation errors', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });

  it('returns VALIDATION_ERROR with per-field details and a readable summary', async () => {
    const err = (await pipe
      .transform({ name: 'A', email: 'nope', extra: 1 }, { type: 'body', metatype: RegisterLike })
      .catch((e: unknown) => e)) as BadRequestException;
    const body = err.getResponse() as {
      error: { code: string; message: string; details: Array<{ field: string }> };
    };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.map((d) => d.field).sort()).toEqual(['email', 'extra', 'name']);
    expect(body.error.message).toMatch(/^Please check 3 fields \(/);
  });
});

describe('ERR-8 / ERR-15 ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();
  const req = {
    requestId: 'rid-12345678',
    method: 'POST',
    originalUrl: '/api/v1/x?y=1',
    url: '/api/v1/x',
  };

  it('uses the request id in pre-built envelopes', () => {
    const { res, host: h } = host(req);
    filter.catch(
      new BadRequestException({
        success: false,
        error: { code: 'X', message: 'm', details: [] },
        meta: { requestId: 'other' },
      }),
      h,
    );
    expect((res.body as { meta: { requestId: string } }).meta.requestId).toBe('rid-12345678');
  });

  it('logs 5xx HttpExceptions with method, path and request id', () => {
    const { res, host: h } = host(req);
    const spy = jest
      .spyOn((filter as unknown as { logger: { error: (m: string) => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    filter.catch(new ServiceUnavailableException('gateway down'), h);
    expect(res.statusCode).toBe(503);
    expect(spy.mock.calls[0][0]).toContain('POST /api/v1/x -> 503 rid=rid-12345678');
  });

  it('maps a unique-constraint race (P2002) to 409 CONFLICT', () => {
    const { res, host: h } = host(req);
    jest
      .spyOn((filter as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      h,
    );
    expect(res.statusCode).toBe(HttpStatus.CONFLICT);
    expect((res.body as { error: { code: string } }).error.code).toBe('CONFLICT');
  });
});

describe('ERR-13 file too large', () => {
  it('names the limit of the route', () => {
    expect(fileTooLargeMessage('/api/v1/admin/question-imports/upload')).toContain('15 MB');
    expect(fileTooLargeMessage('/api/v1/admin/topic-question-imports/upload')).toContain('20 MB');
  });

  it("replaces Multer's bare 413 text", () => {
    const filter = new ApiExceptionFilter();
    const { res, host: h } = host({
      method: 'POST',
      originalUrl: '/api/v1/admin/topic-question-imports/upload',
      url: '',
    });
    filter.catch(new PayloadTooLargeException('File too large'), h);
    expect(res.statusCode).toBe(413);
    expect((res.body as { error: { message: string } }).error.message).toContain('20 MB');
  });
});
