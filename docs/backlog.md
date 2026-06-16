# Backlog / follow-ups

Known, deliberately-deferred items. Not blockers; captured so they aren't lost.

## Report photos
- **Verify `imageKey` references a real object** on report create (a HEAD to R2). Today a
  missing/foreign valid-format key just renders as a broken image - low impact, so deferred.
- **Photo moderation.** Only the flag/dispute mechanism hides a report (and its photo); there's
  no dedicated abuse-report or review queue.

## Anti-abuse / integrity
- **Proof-of-humanity (Cloudflare Turnstile).** The current defenses - rate limit, per-IP vote
  dedupe, the 2 km vote-proximity check - are all bypassable by a script (IPs rotate; the proximity
  check trusts client-sent `lat`/`lng`, so a bot can claim coordinates near any forest). Add an
  invisible Turnstile token to report-create, vote, and upload; verify server-side and reject (403)
  before any write. Highest-leverage hardening - the rest of the integrity work leans on it.

## Privacy / legal
- **Privacy policy + consent (GDPR).** We collect location, hashed IPs, and user photos, and run
  Vercel Analytics + Sentry. An EU public launch needs a privacy policy page and a consent gate
  for non-essential tracking (analytics/Sentry load only after opt-in). Currently missing.

## Safety
- **Severity-aware dispute threshold.** Hiding is a flat `flags - confirmations >= 2` for every
  type, so two flags can hide a `FIRE` or `SHOTS` report - the hazards where wrongly hiding is
  worst. Make the threshold depend on type (critical types need more flags to disappear).
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
