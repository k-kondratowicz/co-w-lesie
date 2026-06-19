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

## Data sources
- **KMZB sync (Krajowa Mapa Zagrożeń Bezpieczeństwa).** Background cron like BDL sync, separate
  table, displayed as a distinct map layer (not mixed with user reports). Relevant types:
  klusownictwo, nielegalna wycinka, niszczenie zieleni, wypalanie traw, zdarzenia drogowe ze
  zwierzetami, quady w lesie, dzikie wysypiska. API is unofficial iMapLite (undocumented,
  EPSG:2180, returns clusters above ~4k features - needs bbox tiling). Filter to forest_area on
  import. Police-verified statuses are higher trust than anonymous tips. Risk: API may change or
  get rate-limited without notice - sync failure must surface as UNKNOWN, not "safe".
  Exploration script: `scripts/fetch-kmzb.ts`.

- **Tick risk layer (kleszcze).** Two potential sources of tick occurrence data in Poland:
  1. **ciemnastronawiosny.pl** - JSON API, no auth needed (token appears static). Endpoint:
     `/ajax?action=_getmapdata&filter={"rok":YYYY}&mapType=ticks&eventtype=all&set=events&cu=0&list=list&token=93ace215d4`.
     Returns `{ events: { [id]: { lng, lat, count, gmina, id, timestamp, k?, data?, gatunek?, choroba? } } }`.
     Already EPSG:4326 - no reprojection needed. `count` = reported tick count at location,
     `gatunek` = species, `choroba` = associated disease. Filter by year via `rok` param.
  2. **narodowekleszczobranie.pl** - citizen-science tick reports (`/pl/zgloszone-kleszcze`);
     data is embedded as an array in page source - scraping required, no known API.
  Goal: periodic sync into a local table (like BDL/KMZB), display as a heatmap/density layer
  on the map, and feed into `assessRisk` as a "tick activity" signal. Useful for hikers and
  dog owners. Caveats: both sources are unofficial - availability and data format may change;
  sync failure must surface as UNKNOWN per the safety rule. Need to check terms of use before
  scraping. Start with source 1 (clean API); source 2 as supplementary later.

## Retention & growth (high priority)
These turn the app from reactive ("check before going") to proactive ("it tells me when
something changes") and drive organic acquisition. Without them the app lives only in the
moment the user remembers to open it.

- **Saved areas + push notifications.** User bookmarks an area (e.g. "Puszcza Niepolomicka")
  and gets web push when: entry ban appears, fire-hazard degree hits III, or new reports cluster
  nearby. This is the only feature that brings users back without an external trigger. Requires
  PWA service worker, push subscription, and a server-side check on each sync cycle.
- ~~**Shareable report links.**~~ Done: `/?report=<id>` deep-links fly the map to the report and
  open the overlay. Share button on each report uses `navigator.share` (mobile) or clipboard copy.
  URL syncs on every popup change so it's always shareable. Opening a shared link defers the
  location permission dialog until the report overlay is closed, so only one dialog is visible
  at a time.

## Engagement loop (medium priority)
Close the feedback loop so reporters stay motivated and planned trips get proactive alerts.

- **"Trip planning" flow.** User picks an area + future date. The app sends a push notification
  the day before if conditions changed (new ban, new reports, fire-hazard change). Built on top
  of saved areas + push infrastructure. Valuable for people planning weekend hikes in advance.
- **Report history (my reports).** User sees their own past reports + whether others confirmed
  or disputed them. Without this, submitting a report feels like it disappears into the void -
  kills motivation to report again. Simple query by `visitorId` + UI list.
- **Confirmation-weighted risk** (see Safety section) - also closes the loop: users see their
  confirmations actually matter for the risk signal.

## Data sources (medium priority)
- **LP official communications (lasy.gov.pl).** Scrape/aggregate official Lasy Panstwowe
  notices: ASF zones, forestry accidents, closures, controlled burns. This makes the app the
  single aggregation point for both official and crowdsourced data - a strong positioning.
  Display as a distinct layer, clearly marked as official. Risk: scraping lasy.gov.pl may
  break; same UNKNOWN-on-failure rule applies.

## Deferred
- **Download-area offline** - cache the forest PMTiles for a chosen area for true no-signal use
  (Range/206 responses can't go in the Cache API, so this needs a dedicated approach).
- **Weather-based fire risk prediction.** Temperature + humidity + wind could forecast fire
  hazard before official BDL sync. Deferred because predicting independently risks contradicting
  official data - dangerous for a safety app. Revisit as a "trend indicator" with heavy
  disclaimers only after the core proactive features ship.
