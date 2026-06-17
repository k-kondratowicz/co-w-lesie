# Backlog / follow-ups

Known, deliberately-deferred items. Not blockers; captured so they aren't lost.

## Report photos
- **Verify `imageKey` references a real object** on report create (a HEAD to R2). Today a
  missing/foreign valid-format key just renders as a broken image - low impact, so deferred.
- **Photo moderation.** Only the flag/dispute mechanism hides a report (and its photo); there's
  no dedicated abuse-report or review queue.

## Anti-abuse / integrity
- **Proof-of-humanity (Cloudflare Turnstile).** Done for **report-create**: an inline widget solves
  a token (`Turnstile` / `getTurnstileToken` for offline replay), verified server-side
  (`verifyTurnstile`), rejecting with 403; offline reports re-solve on replay. **Voting was
  intentionally left out** - it's a low-value, high-frequency one-tap action already guarded by
  proximity + per-IP dedupe + rate-limit, and a per-vote interactive challenge was too much
  friction. Upload also stays on its rate limit (orphan images are cheap and capped). Requires
  `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in prod; fails open when the secret is unset.

## Privacy / legal
- **Privacy policy + consent (GDPR).** Done: `/polityka-prywatnosci` page plus a non-blocking
  consent banner. Vercel Analytics + Speed Insights and Sentry load only after opt-in
  (`AnalyticsConsent` / `initSentryClient`), Sentry runs with `sendDefaultPii: false`, and consent
  can be withdrawn from the policy page (`ConsentControls`). **Remaining:** set a real
  `NEXT_PUBLIC_SITE_CONTACT_EMAIL` in prod - a working data-protection contact is legally required
  (defaults to kontakt@co-w-lesie.pl, which must actually receive mail).

## Safety
- ~~**Severity-aware dispute threshold.**~~ Done: critical hazard types (`FIRE`, `SHOTS`,
  `SHOTS_HEARD`, `HUNTING`, `AGGRESSIVE_ANIMAL`) now require 4 net flags to hide; others keep 2.
  See `DISPUTE_THRESHOLD` in `lifecycle.ts` and the SQL CASE in `GET /api/reports`.
- **Loud stale-data banner.** The risk panel shows per-signal timestamps, but a silent sync death
  isn't prominent. When the BDL sync age exceeds a threshold, show a visible "dane mogą być
  nieaktualne" warning - enforces *missing != safe* at the UI level, not just in the API.
- **Confirmation-weighted risk.** `assessRisk` weighs reports by type + age only; a lone
  unconfirmed report counts the same as one many people confirmed. Feed confirmations/flags into
  the assessment so the crowd signal raises or lowers a report's weight.
- **Merge near-duplicate reports at creation.** A new report of the same type within a small
  radius/time window of an existing one should increment/confirm it instead of spawning a separate
  dot - less map clutter, stronger signal.

## UX / accessibility
- **Filter reports by type** on the map - the natural companion to the existing "since" filter.
- **Accessibility pass** - keyboard navigation and screen-reader labels for the map controls and
  dialogs.

## Ops
- Ensure **`VOTE_SALT` is set in production** (it falls back to a public default, which only
  weakens vote-dedupe, not auth).
- **Sync health alerting** - notify on cron / BDL sync failure so stale data is caught by us, not
  discovered by a user. Pairs with the stale-data banner above.

## Roadmap (parked features)
- **Shareable report links** - deep-link URL (`/?report=<id>`) that opens the map on a report's
  popup, so reports can be shared. Drives return visits and word-of-mouth.
- **Push alerts** - web push to the installed PWA on fire-risk spike / new ban near a saved area.
- **Download-area offline** - cache the forest PMTiles for a chosen area for true no-signal use
  (Range/206 responses can't go in the Cache API, so this needs a dedicated approach).
