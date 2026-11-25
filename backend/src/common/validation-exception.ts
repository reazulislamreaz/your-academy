import { BadRequestException, type ValidationError } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from './request-id';

export type FieldError = { field: string; message: string };

/** Nested DTO errors flattened to dotted paths ("options.0.content"). */
export function flattenValidationErrors(errors: ValidationError[], prefix = ''): FieldError[] {
  const out: FieldError[] = [];
  for (const e of errors) {
    const field = prefix ? `${prefix}.${e.property}` : e.property;
    for (const message of Object.values(e.constraints ?? {})) out.push({ field, message });
    if (e.children?.length) out.push(...flattenValidationErrors(e.children, field));
  }
  return out;
}

/**
 * ERR-3 — ValidationPipe errors as VALIDATION_ERROR with per-field `details`, so forms can
 * highlight the field; the summary names the fields instead of joining raw validator text.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const details = flattenValidationErrors(errors);
  const fields = [...new Set(details.map((d) => d.field))];
  const first = details[0]?.message ?? 'invalid value';
  const message =
    fields.length <= 1
      ? `Please check this field: ${first}`
      : `Please check ${fields.length} fields (${fields.slice(0, 4).join(', ')}${fields.length > 4 ? ', …' : ''}): ${first}`;
  return new BadRequestException(
    createErrorResponse('VALIDATION_ERROR', message, newRequestId(), details),
  );
}
