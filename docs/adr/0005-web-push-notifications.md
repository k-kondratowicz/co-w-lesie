# 0005 - Web Push for saved-area hazard alerts

**Status:** accepted

## Context

The top retention ask in the survey was being told when conditions change in an area the user
cares about, instead of having to remember to open the app. Respondents explicitly rejected
voivodeship-wide alerts ("I don't want threats for the whole voivodeship"), so alerts must be
scoped to a user's own saved area. This is a safety app, so an alert must never read as
reassurance.

## Decision

- **Web Push (VAPID)**, not native push or a third-party service. The app is already an installable
  PWA with a service worker; Web Push works on Android/desktop and on iOS 16.4+ for installed PWAs,
  with no app stores and no per-message vendor cost. The `web-push` library handles VAPID signing.
- **Anonymous, per-device subscriptions.** A `PushSubscription` row is keyed by its push `endpoint`
  (unique, upserted on re-subscribe) and scoped to the same anonymous `visitorId` as `SavedArea` -
  no accounts. One visitor may have several devices; all get the alert.
- **Server-side evaluation on a separate cron** (`/api/cron/notify-areas`), triggered by the
  GitHub Actions workflow right after the BDL sync so areas are checked against fresh fire/ban data.
  It reuses the same `assessPoint` orchestration as `/api/risk`, so push and the UI read identical
  signals. Kept separate from `sync-bdl` so it is independently retriable and observable.
- **Onset-only, RED triggers only.** We push when a hazard newly appears since the last alert:
  an entry ban, or fire-hazard degree III (the two RED triggers). A `lastAlertSignature` on
  `SavedArea` records the standing hazard set so a continuing ban never re-alerts every cycle.
  Lower fire degrees and report clusters do not notify in this MVP.

## Consequences

- **No "all clear" push, ever.** When a hazard lifts we silently reset the signature (so the next
  onset re-alerts) but send nothing - a "now safe" message would violate the safety rule. The
  notification copy names the hazard and always advises caution + checking official LP notices.
- Dead subscriptions (push service returns 404/410) are pruned on send, so the table self-heals.
- Without VAPID env keys the sender fails closed and the subscribe endpoint returns 503 - push is
  simply disabled, the rest of the app is unaffected.
- Evaluation is O(saved areas) queries per run; fine at current volume. If areas grow large this
  needs batching or a spatial pre-filter (only areas near a changed zone).
- iOS only delivers push to an installed (home-screen) PWA, not Safari tabs - a known platform
  limit we surface implicitly via the browser's own permission flow.
