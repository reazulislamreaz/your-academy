# 21 — Design System

**Status:** Elevated (2026-11-11 UI polish)  
**Product:** Your Academy  
**Direction:** “Exam desk” — cool paper surfaces, faint ruled texture, deep navy ink, **red** accent CTAs (`--highlight: #e31e24`). CSS tokens in `frontend/src/app/globals.css` are the source of truth.

Do **not** drift into purple SaaS gradients, cream+terracotta serif kits, amber-as-primary kits, or neon glow kits. Learner `(app)` uses Orbit-style charcoal (DEC-027); marketing/auth/admin stay light.

---

## 1. Brand principles

1. **Brand first on marketing** — “Your Academy” is the hero signal; supporting copy stays secondary.
2. **One job per section** — avoid stat strips and card grids on heroes (stats may sit below the fold).
3. **Surfaces with purpose** — `Surface` for forms/tables; open / list-row layouts for browse lists; reading column for MCQ/news/PDF detail.
4. **Admin ≠ learner** — dense navy sidebar admin chrome; charcoal Orbit learner shell (DEC-027).
5. **Motion with restraint** — fade/rise + press feedback; honor `prefers-reduced-motion`.
6. **Show the product** — marketing may include a static MCQ desk preview below the fold; never fabricate testimonials.
7. **Honest entitlements** — locked answers use `EntitlementCallout`; never invent `isCorrect` client-side.

---

## 2. Color tokens (`globals.css` `:root`)

| Token | Role | Value (reference) |
|-------|------|-------------------|
| `--bg` | Page | `#FFFFFF` |
| `--bg-desk` | Learner/admin canvas | `#EEF2F7` |
| `--bg-sidebar` | Learner sidebar | `#FBFCFE` |
| `--bg-elevated` | Panels | `#FFFFFF` |
| `--bg-muted` | Soft fill | `#EEF2F7` |
| `--bg-inverse` | Admin / dark panels | `#002050` |
| `--ink` | Primary text | `#002050` |
| `--muted` / `--muted-strong` | Secondary text | `#46566B` / `#334155` |
| `--line` | Borders | `#E2E8F0` |
| `--highlight` | Primary CTA (brand red) | `#E31E24` |
| `--highlight-soft` | Soft accent | `#FDECEC` |
| `--highlight-hover` | Soft button hover | `#FADCDC` |
| `--accent` | Secondary solid (navy) | `#002050` |
| `--success` / `--danger` / `--warning` | Semantic | teal / deep red / amber |
| `--shadow-header` | Sticky learner header | soft layered |

Page atmosphere (light shells): cool navy/red radial washes on desk canvas. Learner shell: `.learner-theme` charcoal overrides + `.learner-sidebar`; active nav is a soft grey pill (no bright red wash).

### Learner shell themes (`.learner-theme`, DEC-027 / DEC-028)

Scoped to `(app)` only. Toggle via header Sun/Moon (`LearnerThemeToggle`).  
`data-theme="light"` (default) | `data-theme="dark"`. Persist: `localStorage` `ya-learner-color-scheme`. FOUC boot script in `(app)/layout`.

**Light (default):** soft off-white desk `#F3F5F9`, white cards/sidebar, navy ink, blue/purple accents, soft shadows.  
**Dark:** cool navy-charcoal `#0B1020` canvas, elevated `#141B2D` cards, soft borders, same semantic roles.

| Token | Role |
|-------|------|
| `--highlight` | Primary CTA (brand red) |
| `--accent` | Focus, selection, chrome |
| `--success` / `--danger` / `--warning` / `--info` | Semantic feedback |
| `--insight` / `--bookmark` | Review / saved |
| `--learn-*` / `--viz-*` | MCQ + chart aliases |
| `--focus-ring` | Field / keyboard focus |

**MCQ status map:** idle → muted · selected → accent · correct → green · incorrect → soft red · bookmarked → gold · completed → green · review → purple.

Collapse width: `--app-sidebar-collapsed-width` (`ya-learner-sidebar-collapsed`). Target text contrast ≥ 4.5:1.

Do **not** apply `data-theme` or this toggle outside `(app)`.

---

## 3. Typography (`lib/fonts.ts` + `next/font`)

| Role | Family | CSS var / class |
|------|--------|-----------------|
| Brand / headings | **Syne** | `--font-display` / `.font-display` |
| UI / body (marketing, auth, admin) | **Manrope** | `--font-sans` |
| Learner shell UI | **Inter** | `--font-learner` under `.learner-theme` |
| Long-form reading (MCQ, news) | **Source Serif 4** | `--font-reading` / `.font-reading` |

Bengali UI fonts are **out of scope** until i18n is approved.

---

## 4. Radius, shadow, spacing

- Radius: `--radius-sm` 8 · `--radius` 12 · `--radius-lg` 16 · `--radius-xl` 22  
- Prefer **12px controls** (`--radius`); reserve `rounded-full` for avatars, progress tracks, and small indicators — not primary buttons.
- Shadows: `--shadow-sm` / `--shadow` / `--shadow-lg`
- Section padding: `--space-section` (utility `.section-pad`)
- Page inline: `--space-page` (utility `.page-pad`)

---

## 5. Components

### `components/ui`

| Component | Use |
|-----------|-----|
| `Button` | `primary` (amber), `secondary` (navy), `outline`, `ghost`, `danger`, `soft` |
| `Input` / `Textarea` / `Select` / `Label` / `Field` | Forms |
| `Badge` | Difficulty, status |
| `Alert` | Inline feedback |
| `Skeleton` / `SkeletonRegion` / `ContentIn` | Content-shaped placeholders + fade handoff |
| `Surface` | Bordered panel (`density`, `quiet` optional) |
| `ListRow` | Quiet browse-list rows (prefer over boxed cards) |
| `EmptyState` | Zero-data / auth-required |
| `Separator` | Dividers |
| `Button` `loading` | Inline orbit loader; disables control |

### `components/loading` (unified system)

| Component | Use |
|-----------|-----|
| `GlobalLoader` | Cold start / root `loading.tsx` only — brand pulse, full viewport |
| `RouteProgress` | Thin top bar on client navigations (mounted in `Providers`) |
| `PageLoader` | In-shell Suspense (`(marketing|app|admin|auth)/loading.tsx`) |
| `BrandPulse` | YA mark breathe + ring (no generic spinner) |
| `InlineLoader` | Buttons / compact actions |
| `ProgressBar` | Uploads & bulk MCQ import (determinate / indeterminate) |
| `ListCardSkeleton` | Marketing / public list placeholders |
| `LoadError` | Failed fetch + optional **Try again** |
| `Delayed` / `useDeferredLoading` | Anti-flicker for overlay-style waits |

**Rules:** Prefer route skeletons for data; never full-screen-block for small API calls; use `isLoading` not `isFetching`; honor `prefers-reduced-motion`.

### Feature / access

| Component | Use |
|-----------|-----|
| `TrialStatusChip` | App header trial remnant / ended (learners) |
| `EntitlementCallout` | Practice hint or locked premium explanation |
| `OptionRow` | MCQ option states: idle / selected / correct / incorrect / missed |
| `FilterChips` | Removable active question filters |
| `QuestionFilters` | Sticky filter bar |
| `SampleMcq` | Static marketing MCQ desk frame |
| `TrialCountdown` | Profile / study home countdown |

Layout: `BrandMark`, `MarketingHeader`, `AppHeader`, `AdminSidebar`, `AdminMobileNav`, `SiteFooter`, `PageHeader`, `MobileNav` / `DesktopNav`.

Admin primitives (`components/admin/`): `AdminPage`, `AdminSection`, `AdminToolbar`, `AdminTable` / `AdminTableShell` — use on every `/admin/*` route for spacing, filters, and tables.

Study prefs (authoritative, DB): `PATCH /users/me/study-prefs` + `MeUser.study` — preferred root categories (max 3), onboarding completion, last opened/attempted question for Continue. `lib/study-prefs.ts` only has display helpers.

List utility: `.list-row` in `globals.css` for hover/divider rhythm.

---

## 6. Shells (route groups)

| Group | Shell | Routes |
|-------|-------|--------|
| `(marketing)` | Marketing header + footer | `/` |
| `(auth)` | Split navy brand panel + form (desktop); stacked on mobile | `/login`, `/register`, … |
| `(app)` | Learner shell (`.learner-theme` light/dark): collapsible sidebar + sticky header (theme toggle, pill search + ⌘K, Saved MCQ, updates, trial, profile) | `/home`, `/onboarding`, `/questions`, `/bookmarks`, `/news`, `/profile`, … |
| `(admin)` | `.admin-theme` navy inverse sidebar + light desk canvas; grouped Console/Content nav; mobile drawer | `/admin/*` |

Root `layout.tsx` only mounts fonts + providers (no global header).

Marketing hero: full-bleed navy plane; brand + one line + CTAs only in first viewport. Below fold: live stats, how trial works, product preview, categories, news, trust strip (live counts only), closing CTA.

Post-login default: `/home`. Post-register: `/onboarding` then practice or home.

Practice player: select → **Check answer** → feedback / locked callout; sticky bottom prev / check / next.

Admin overview: work queue (drafts, trials, expired) above KPI grid.

---

## 7. Motion

CSS-first system in `frontend/src/app/globals.css`. Shared helpers:

| Utility / component | Behavior |
|---------------------|----------|
| `PageShell` | Short fade+rise on client route change (`motion-page`) |
| `Reveal` | One-shot viewport enter (`.motion-reveal` → `.is-visible`) |
| `Stagger` / `.motion-stagger` | Staggered child rise (`--stagger-step`) |
| `.motion-fade-in` | Opacity enter |
| `.motion-rise` | Fade + 10px rise |
| `.motion-pop` | Dropdown / menu pop |
| `.motion-drawer-in` | Mobile drawer enter |
| `.motion-scale-in` | Soft scale for alerts |
| `.motion-content-in` | Swap-in after skeleton |
| `.motion-hover-lift` | Hover lift + shadow (cards) |
| `.motion-press` | Active press |
| `.motion-nav-indicator` | Fast color/bg |
| `.skeleton` | Soft L→R shimmer (theme wash) |
| `SkeletonRegion` / `ContentIn` | Busy region + fade handoff |
| `@/components/skeletons` | **Page-specific** route skeletons under `components/skeletons/route/` |
| `RouteProgress` / `BrandPulse` / `PageLoader` | Navigation + brand loading (see §5) |

**Skeleton / loading rules:**
- One dedicated skeleton per route (e.g. `HomePageSkeleton`, `AdminUsersTableSkeleton`) composed from small primitives (`SkLine`, `SkBadge`, `PageHeaderSkeleton`).
- Match grids, table columns, card radii, sticky bars, and responsive breakpoints of the real page.
- Prefer `omitHeader` / section skeletons when the live `PageHeader` already paints.
- Use `isLoading` (no cached data), not `isFetching`; announce with `aria-busy` + sr-only label.
- Soft L→R shimmer; respect `prefers-reduced-motion`.
- Context-aware: global → page → skeleton → inline → progress. No spinner carpet-bombing.

Tokens: `--duration-fast` / `--duration` / `--duration-slow` + `--ease-out`. Prefer transform/opacity. All entrance/hover motion is disabled under `prefers-reduced-motion: reduce`. Do not add Framer Motion unless a feature truly needs it.

---

## 8. Implementation rules for agents

1. Use tokens/variables — avoid one-off hex in features.
2. Use `PageHeader` on app/admin list pages.
3. Do not reintroduce cream/teal Fraunces/Sora Google `@import` fonts.
4. Do not put KPI cards or filter chrome in the marketing hero.
5. Prefer `ListRow` / open dividers for browse lists; `Surface` for forms and interactive panels.
6. Use shared `Select` / `Field` instead of duplicated select class strings.
7. When adding shadcn-generated files later, map them onto these CSS variables.
8. Do not invent testimonials or fake correctness for non-entitled users.
9. Update this doc when tokens or shells change.
