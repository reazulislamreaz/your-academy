import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const log = new Logger('ImportError');

/**
 * ERR-9 — what an import row / batch stores as its error. Our own messages ("Category not
 * found: …") are written for admins and kept; database driver errors (Prisma's multi-line
 * "Invalid `tx.question.create()` invocation…") are logged in full and replaced by a short,
 * actionable message with the Prisma error code for support.
 */
export function importErrorMessage(err: unknown, context: string): string {
  const isDbError =
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError;
  if (isDbError) {
    log.warn(`${context}: ${err instanceof Error ? err.message : String(err)}`);
    const code = err instanceof Prisma.PrismaClientKnownRequestError ? ` (ref ${err.code})` : '';
    return `The database rejected this row — a value may be too long or invalid. Check the row and try again${code}.`;
  }
  if (err instanceof Error) return err.message.slice(0, 500);
  return 'Import failed';
}
