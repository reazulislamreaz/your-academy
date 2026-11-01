# 18 — Coding Standards

Complement `.cursor/rules/*` and `AGENTS.md`.

## 1. General

- TypeScript `strict` true
- Prefer explicit return types on exported public functions
- No `any` unless justified with comment
- Avoid premature abstractions; extract when duplication is real
- Keep PRs/changes focused; update docs when behavior changes

## 2. Naming

| Kind | Convention |
|------|------------|
| Files / dirs | `kebab-case` |
| React components | `PascalCase` filename matching component |
| Nest modules | `users.module.ts`, `users.service.ts` |
| Prisma models | `PascalCase` |
| DB columns | `snake_case` via `@map` |
| Env vars | `SCREAMING_SNAKE_CASE` |
| Constants | `SCREAMING_SNAKE` or `camelCase` as appropriate |

## 3. Backend Style

- One feature per module folder: `dto/`, `controllers/`, `services/`, `repositories/`
- Controllers ≤ thin; map domain errors to HTTP
- Services orchestrate; no raw SQL unless justified and reviewed
- Use transactions for multi-step writes
- Enumerate allowlists for sort/filter params

## 4. Frontend Style

- Feature folders over type-only folders for domain UI
- Colocate small component-specific utils
- Prefer composition over prop drilling mega-objects
- Client components marked explicitly
- Tailwind utility classes; extract components when class soup repeats

## 5. Error Handling

- Throw typed domain errors (`NotFoundError`, `ForbiddenError`, `ConflictError`)
- Global filter maps to error envelope with stable `code` strings
- Never swallow errors silently; log with requestId

## 6. Logging

- Structured fields: `requestId`, `userId`, `path`, `durationMs`
- Never log passwords, tokens, Authorization headers, Cloudinary signatures

## 7. Comments

- Comment **why**, not what
- Do not leave commented-out code

## 8. Git Hygiene (when commits requested)

- Imperative commit subjects focused on why
- Do not commit `.env`, keys, dumps, `node_modules`

## 9. Shared Package Rules

- Export types/schemas only
- Version internally with workspace protocol
- Breaking contract changes require API doc + consumer updates

## 10. Accessibility & i18n

- Forms with labels; keyboard operable admin tables
- Single locale initially; avoid hardcoding user-facing strings in too many layers if i18n likely later
