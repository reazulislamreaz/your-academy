import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function newRequestId(): string {
  return randomUUID();
}

export type RequestWithId = Request & { requestId?: string };

const INCOMING_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/**
 * ERR-8 — one id per request: reuses a well-formed incoming X-Request-Id (e.g. from a proxy),
 * otherwise mints one. Echoed in the X-Request-Id response header, written into every error
 * envelope by ApiExceptionFilter and into its log line, so a user-quoted id finds the log.
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  const id = incoming && INCOMING_ID_RE.test(incoming) ? incoming : newRequestId();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
