# 21 — Design System

**Status:** Elevated (2026-11-05 Option B UI polish)  
**Product:** Your Academy  
**Direction:** “Exam desk” — cool paper surfaces, faint ruled texture, deep navy ink, amber highlighter CTAs.

Do **not** drift into purple SaaS gradients, cream+terracotta serif kits, or neon dark dashboards.

---

## 1. Brand principles

1. **Brand first on marketing** — “Your Academy” is the hero signal; supporting copy stays secondary.
2. **One job per section** — avoid stat strips and card grids on heroes (stats may sit below the fold).
3. **Surfaces with purpose** — `Surface` for forms/tables; open / list-row layouts for browse lists; reading column for MCQ/news/PDF detail.
4. **Admin ≠ learner** — dense navy sidebar admin chrome; calmer app shell for study.
5. **Motion with restraint** — fade/rise + press feedback; honor `prefers-reduced-motion`.
6. **Show the product** — marketing may include a static MCQ desk preview below the fold; never fabricate testimonials.
7. **Honest entitlements** — locked answers use `EntitlementCallout`; never invent `isCorrect` client-side.

---

## 2. Color tokens (`globals.css` `:root`)

| Token | Role | Value (reference) |
|-------|------|-------------------|
| `--bg` | Page | `#F1F4F8` |
| `--bg-desk` | Desk wash / admin canvas | `#E9EEF5` |
| `--bg-elevated` | Panels | `#FFFFFF` |
| `--bg-muted` | Soft fill | `#E6EBF2` |
| `--bg-inverse` | Admin / dark panels | `#0B1F33` |
| `--ink` | Primary text | `#0B1F33` |
| `--muted` | Secondary text | `#5C6B7A` |
| `--line` | Borders | `#D5DCE5` |
| `--highlight` | Primary CTA | `#E5A008` |
| `--highlight-soft` | Soft accent | `#FFF4D6` |
| `--highlight-hover` | Soft button hover | `#FFE9B0` |
| `--accent` | Secondary solid (navy) | `#0B1F33` |
| `--success` / `--danger` | Semantic | teal / red |

Page atmosphere: fixed faint horizontal rules + cool navy/amber radial washes (not decorative glow kits).

---

## 3. Typography (`lib/fonts.ts` + `next/font`)

| Role | Family | CSS var / class |
|------|--------|-----------------|
| Brand / headings | **Syne** | `--font-display` / `.font-display` |
| UI / body | **Manrope** | `--font-sans` |
| Long-form reading (MCQ, news) | **Source Serif 4** | `--font-reading` / `.font-reading` |

Bengali UI fonts are **out of scope** until i18n is approved.

---

## 4. Radius, shadow, spacing

- Radius: `--radius-sm` 8 · `--radius` 12 · `--radius-lg` 16 · `--radius-xl` 22  
- Prefer **12px controls**, not pill-everything.
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
| `Skeleton` | Loading placeholders |
| `Surface` | Bordered panel (`density`, `quiet` optional) |
| `ListRow` | Quiet browse-list rows (prefer over boxed cards) |
| `EmptyState` | Zero-data / auth-required |
| `Separator` | Dividers |

### Feature / access

| Component | Use |
|-----------|-----|
| `TrialStatusChip` | App header trial remnant / ended (learners) |
| `EntitlementCallout` | Practice hint or locked premium explanation |
| `OptionRow` | MCQ option states: idle / selected / correct / incorrect / missed |
| `FilterChips` | Removable active question filters |
| `QuestionFilters` | Sticky filter bar |
| `ProductPreview` | Static marketing MCQ desk frame |
| `TrialCountdown` | Profile / study home countdown |

Layout: `BrandMark`, `MarketingHeader`, `AppHeader`, `AdminSidebar`, `AdminMobileNav`, `SiteFooter`, `PageHeader`, `MobileNav` / `DesktopNav`.

Study prefs (authoritative, DB): `PATCH /users/me/study-prefs` + `MeUser.study` — preferred root categories (max 3), onboarding completion, last opened/attempted question for Continue. `lib/study-prefs.ts` only has display helpers.

List utility: `.list-row` in `globals.css` for hover/divider rhythm.

---

## 6. Shells (route groups)

| Group | Shell | Routes |
|-------|-------|--------|
| `(marketing)` | Marketing header + footer | `/` |
| `(auth)` | Split navy brand panel + form (desktop); stacked on mobile | `/login`, `/register`, … |
| `(app)` | Learner header (+ trial chip) | `/home`, `/onboarding`, `/questions`, `/bookmarks`, `/news`, `/profile`, … |
| `(admin)` | Navy sidebar + mobile tabs | `/admin/*` |

Root `layout.tsx` only mounts fonts + providers (no global header).

Marketing hero: full-bleed navy plane; brand + one line + CTAs only in first viewport. Below fold: live stats, how trial works, product preview, categories, news, trust strip (live counts only), closing CTA.

Post-login default: `/home`. Post-register: `/onboarding` then practice or home.

Practice player: select → **Check answer** → feedback / locked callout; sticky bottom prev / check / next.

Admin overview: work queue (drafts, trials, expired) above KPI grid.

---

## 7. Motion

| Class | Behavior |
|-------|----------|
| `.motion-fade-in` | Opacity enter |
| `.motion-rise` | Fade + 10px rise |
| `.motion-press` | Active press |
| `.motion-nav-indicator` | Fast color/bg |

Disabled under `prefers-reduced-motion: reduce`.

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
