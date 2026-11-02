# 21 — Design System

**Status:** Phase 2 established (2026-11-02)  
**Product:** Your Academy  
**Direction:** “Exam desk” — cool paper surfaces, deep navy ink, amber highlighter CTAs.

Do **not** drift into purple SaaS gradients, cream+terracotta serif kits, or neon dark dashboards.

---

## 1. Brand principles

1. **Brand first on marketing** — “Your Academy” is the hero signal; supporting copy stays secondary.
2. **One job per section** — avoid stat strips and card grids on heroes.
3. **Surfaces with purpose** — `Surface` for forms/tables; open layout for marketing heroes and reading.
4. **Admin ≠ learner** — dense navy sidebar admin chrome; calmer app shell for study.
5. **Motion with restraint** — fade/rise + press feedback; honor `prefers-reduced-motion`.

---

## 2. Color tokens (`globals.css` `:root`)

| Token | Role | Value (reference) |
|-------|------|-------------------|
| `--bg` | Page | `#F3F5F8` |
| `--bg-elevated` | Panels | `#FFFFFF` |
| `--bg-muted` | Soft fill | `#E8ECF1` |
| `--bg-inverse` | Admin / dark panels | `#0B1F33` |
| `--ink` | Primary text | `#0B1F33` |
| `--muted` | Secondary text | `#5C6B7A` |
| `--line` | Borders | `#D5DCE5` |
| `--highlight` | Primary CTA | `#E5A008` |
| `--highlight-soft` | Soft accent | `#FFF4D6` |
| `--accent` | Secondary solid (navy) | `#0B1F33` |
| `--success` / `--danger` | Semantic | teal / red |

Legacy aliases kept for gradual migration: `--accent` remains usable; primary **buttons** use `--highlight`.

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
- Section padding: `--space-section`

---

## 5. Components (`components/ui`)

| Component | Use |
|-----------|-----|
| `Button` | `primary` (amber), `secondary` (navy), `outline`, `ghost`, `danger`, `soft` |
| `Input` / `Textarea` / `Label` | Forms |
| `Badge` | Difficulty, status |
| `Alert` | Inline feedback |
| `Skeleton` | Loading placeholders |
| `Surface` | Bordered panel |
| `EmptyState` | Zero-data |
| `Separator` | Dividers |

Layout: `BrandMark`, `MarketingHeader`, `AppHeader`, `AdminSidebar`, `AdminMobileNav`, `SiteFooter`, `PageHeader`, `MobileNav` / `DesktopNav`.

---

## 6. Shells (route groups)

| Group | Shell | Routes |
|-------|-------|--------|
| `(marketing)` | Marketing header + footer | `/` |
| `(auth)` | Minimal brand bar | `/login`, `/register` |
| `(app)` | Learner header | `/questions`, `/bookmarks`, `/news`, `/profile` |
| `(admin)` | Sidebar + mobile tabs | `/admin/*` |

Root `layout.tsx` only mounts fonts + providers (no global header).

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
5. When adding shadcn-generated files later, map them onto these CSS variables.
6. Update this doc when tokens or shells change.
