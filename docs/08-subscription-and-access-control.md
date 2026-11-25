# 08 — Free vs Paid Access & Subscriptions (DEC-060)

Supersedes the trial / answer-gating model (DEC-051 / DEC-052). Full decision record:
`docs/19-decisions-and-assumptions.md` → DEC-060.

## 1. Principle

The API is the only security boundary. Locked content is never loaded or sent (not in list
payloads, not in SSR HTML). The UI lock icon is UX only.

## 2. One decision point — `AccessPolicyService`

`backend/src/billing/access-policy.service.ts`, resolved once per request:

0. **Topic Base** questions (`TOPIC`) need a signed-in account first — even when the paid system is OFF (DEC-061).
1. **Admin** → full access.
2. **Paid system OFF** (`site_settings.paid_system_enabled`) → full access for everyone.
3. **Content is free** → open.
4. **Active subscription** (`disabled_at IS NULL AND starts_at <= now < ends_at`) → open.
4a. **Topic Base only:** running 7-day trial (`now < users.trial_ends_at`, DEC-061 / DEC-063) → open. The trial is never `fullAccess` and unlocks nothing else.
5. Otherwise → `403 CONTENT_LOCKED` (`error.details[0].loginRequired` for guests).

Suspended / deleted / unknown accounts are treated as guests. Moderators have no paid bypass.
Expiry needs no job: the check runs at request time.

## 3. What is free / paid

| Content | Rule |
|---------|------|
| Preli sets (`QuestionUploadBatch`) | First `preli_free_set_count` (default 10) in display order are free |
| Written sets (`WrittenUploadBatch`) | First `written_free_set_count` (default 10) are free |
| Bank MCQ (`Question`) | Inherits its set's lock; MCQs without a set are free |
| Model Tests | Per test `access = FREE | PAID` (create / edit toggle) |
| Documents | `PREMIUM` = paid; `PUBLIC` / `AUTHENTICATED` free |
| Topic Base questions | Login always; then trial / subscription when paid system ON (names stay public) — DEC-061 |
| Quizzes, practice sets, news | Free |

Display order (`billing/set-order.ts`, shared by lists and the rule):
`questionDate DESC NULLS LAST, createdAt DESC, id DESC`, over the **unfiltered** list of
finished imports with ≥1 published question. Newest N are free; a new upload shifts the window.

Locked sets / tests stay in lists with `locked: true` (title, counts) so learners see what a
plan unlocks; detail, questions, practice-score, attempts and results answer 403.

## 4. Subscriptions

- One `user_subscriptions` row per user (`package_id` = last package applied).
- Purchase / package grant: if running, the duration is added to `ends_at`; otherwise it starts now.
  Durations are calendar months (3 / 6 / 12; legacy Monthly = 1).
- DEC-062 — no automatic charging (SSLCommerz recurring is not enabled). Learners renew from
  `/billing`; **upgrade** = buy now (time added on top, plan switches at once), **downgrade** =
  `scheduled_package_id`, bought by the Renew button at the next renewal, **cancel** =
  `cancel_at_period_end` (access until `ends_at`). A purchase clears cancel / scheduled change.
- DEC-062 — reminders 7 and 3 days before `ends_at` (verified email only, paid system ON), once
  per period: flags are claimed atomically and reset whenever `ends_at` changes.
- Admin: grant (package or custom end date), extend by days, disable / enable.
- Every change → `subscription_events` (source `MANUAL | PAYMENT | MIGRATION`, actor, previous /
  new end) in the same transaction, plus `audit_logs`.

## 5. Payments

See DEC-060 and README "Payments (SSLCommerz)". Activation only through
`PaymentsService.processValidation` (Order Validation API + tran_id / amount / currency / store
match, `FOR UPDATE` + `applied_at` → exactly once).

## 6. Testing obligations

`backend/src/billing/__tests__/*`: policy order, free-N, locks per content kind, renewal math,
validation rejects (amount, currency, tran_id, store, status, signature), risk hold, duplicate /
racing callbacks, lost-IPN re-check, paid-system-OFF purchase block.

## 7. Anti-patterns

- Duplicating subscription / free-N math outside `AccessPolicyService`.
- Trusting price, package, user or status from the client or the gateway POST body.
- Returning a locked set's questions "just the titles" from a question endpoint.
