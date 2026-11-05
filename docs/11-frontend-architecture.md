# 11 — Frontend Architecture

## 1. Stack

Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Lucide React.

## 2. Top-Level Structure

```text
frontend/
  src/app/
    (public)/           # marketing, public news
    (auth)/             # login, register, reset
    (app)/              # authenticated learner
      home/             # study home (continue, trial, suggestions)
      onboarding/       # post-register topic picks + trial explainer
      questions/
      bookmarks/
      profile/
      news/
      documents/
    (admin)/            # admin dashboard & CRUD
      users/
      questions/
      categories/
      news/
      documents/
      analytics/
    api/                # optional BFF routes only if required
  components/
    ui/                 # shadcn
    shared/
  features/
    auth/
    questions/
    bookmarks/
    analytics-heartbeat/
    admin/
  lib/
    api/                # typed fetch clients
    auth/
    utils/
  styles/
```

## 3. Rendering Strategy

| Case | Approach |
|------|----------|
| Marketing, static shells | Server Components |
| Question lists needing cookies | Server fetch or client Query |
| Forms, bookmarks toggles, admin tables | Client Components |
| Browsing heartbeat | Client only (visibility + interval) |
| Admin charts | Client |

Default to Server Components; add `"use client"` only when required.

## 4. Server State

- TanStack Query for client-fetched/mutated server state
- Query keys: `['questions', filters]`, `['question', id]`, `['me']`, etc.
- Invalidate on mutations (bookmark add → invalidate lists)
- Avoid Redux/Zustand unless a clear cross-cutting UI state appears

## 5. Forms & Validation

- React Hook Form + Zod
- Share Zod schemas with `shared/` when identical to API
- Accessible error rendering; disable submit while pending

## 6. Auth UX (DEC-012)

- Register/login set HTTP-only auth cookies via API; do **not** store JWTs in `localStorage`
- All API clients use `credentials: 'include'`
- Mutating requests send `X-CSRF-Token` from the readable `csrf_token` cookie
- Route guards: middleware may check presence of session hint; **always** rely on API 401/403
- On 401: try `/auth/refresh` once, then redirect to login
- Admin layout: hide nav if role≠ADMIN; API still enforces

## 7. Answer Privacy UX

- Components accept option type **without** required `isCorrect`
- If field absent, do not show checkmarks/explanations
- Never fabricate correctness client-side
- Trial banner: days remaining from `trialEndsAt`

## 8. API Client

```text
lib/api/http.ts          # base fetch, credentials, error mapping
lib/api/questions.ts
lib/api/auth.ts
…
```

- Strict TypeScript types from shared package
- Central handling for 401 → refresh → retry once

## 9. Heartbeat Client

- Interval 30s when `document.visibilityState === 'visible'` and not idle
- Idle: no pointer/keyboard for threshold (DEC-009)
- Single `clientInstanceId` per tab (UUID in sessionStorage)
- Pause on hidden; end session on logout/unload (`sendBeacon` best-effort)

## 10. Styling

- **Source of truth:** [`docs/21-design-system.md`](21-design-system.md) (“exam desk” navy + amber)
- Tailwind v4 + CSS variables in `frontend/src/app/globals.css`
- `next/font`: Syne (display), Manrope (UI), Source Serif 4 (reading)
- Primitives in `frontend/src/components/ui/*` (CVA); layout shells in `components/layout/*`
- Route-group shells: `(marketing)` / `(auth)` / `(app)` / `(admin)`
- Responsive layouts; `:focus-visible` rings; `prefers-reduced-motion`
- Avoid purple-gradient / cream-terracotta AI clichés

## 11. Performance

- Next/Image with Cloudinary loader
- Lazy load heavy admin charts
- Cursor pagination UI for questions
- Avoid huge client bundles on public pages

## 12. Testing Touchpoints

- Form validation tests
- Auth flow smoke
- Admin route permission UI
- Question detail renders without crashing when `isCorrect` omitted
