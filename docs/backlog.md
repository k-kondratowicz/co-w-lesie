# Backlog / follow-ups

Known, deliberately-deferred items. Not blockers; captured so they aren't lost.

## Report photos
- **Verify `imageKey` references a real object** on report create (a HEAD to R2). Today a
  missing/foreign valid-format key just renders as a broken image - low impact, so deferred.
- **Photo moderation.** Only the flag/dispute mechanism hides a report (and its photo); there's
  no dedicated abuse-report or review queue.

## Ops
- Ensure **`VOTE_SALT` is set in production** (it falls back to a public default, which only
  weakens vote-dedupe, not auth).

## Roadmap (parked features)
- **Push alerts** - web push to the installed PWA on fire-risk spike / new ban near a saved area.
- **Download-area offline** - cache the forest PMTiles for a chosen area for true no-signal use
  (Range/206 responses can't go in the Cache API, so this needs a dedicated approach).
