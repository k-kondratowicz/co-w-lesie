# Backlog / follow-ups

Known, deliberately-deferred items. Not blockers; captured so they aren't lost.

> **Survey signal (2026-06, ~74 respondents).** A user survey reshuffled priorities. Top
> findings: (1) **hunting locations** are the single most-requested piece of info - not yet a
> first-class feature; (2) **push for a self-chosen area** (not whole voivodeship) is the
> retention hook; (3) **offline / no cell coverage** is the top friction blocker, not a
> nice-to-have; (4) most users currently check *nothing* before going; (5) many didn't report
> incidents only because they "didn't know where to". Secondary asks: rabies-vaccine drops,
> ticks, windthrow/weather warnings, legal overnight/bushcraft zones. Items below are annotated
> `[survey]` where this validates or re-ranks them.

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
- **Hunting locations (polowania zbiorowe).** `[survey: #1 most-requested signal]` By a wide
  margin the most-wanted piece of info, with strong emotional pull ("I never want to run into a
  hunter who mistakes me or my dog for a boar"). Collective-hunt schedules (date + area/circuit)
  are published by gminy and RDLP, but there's no single national feed - sources are scattered
  PDFs/HTML per gmina/nadlesnictwo, so expect a per-source scraper or a structured manual/admin
  entry path to start. Treat like BDL/KMZB: separate table with a validity window (hunt date),
  distinct map layer, feeds `assessRisk` (active hunt nearby today raises the level). Safety rule
  still applies: absence of a listed hunt is not proof none is happening - never imply "no hunts
  = safe", surface coverage limits. Start with one region's published schedule to prove the flow.
- ~~**Rabies-vaccine drops (szczepionki dla dzikich zwierzat).**~~ `[survey: frequent ask]` Done
  (advisory): fox oral-rabies baiting schedule scraped from `lisy.info/harmonogram.php` (no API
  exists). Monthly background sync (`/api/cron/sync-vaccination`, `src/shared/lib/lisy/`) parses the
  static HTML table into `vaccination_campaign {year, start_date, end_date, voivodeship}`,
  zod-validated, truncate+insert, empty-parse refuses to wipe the table (missing != safe). The page
  gives voivodeship names only, so granularity is whole-voivodeship: GUS PRG boundaries loaded once
  into a static `voivodeship` table (`scripts/seed-voivodeships.ts`, ogr2ogr 2180->4326, NOT synced)
  for a point-in-voivodeship lookup. `queryVaccinationAdvisory` flags active when today is within
  `[start - 14d, end + 14d]`; surfaced as an informational banner in the safety assistant (don't
  touch baits, leash dog) with source + freshness, **deliberately not scored / never a RED trigger**
  (like the KMZB advisory). Monthly cron wired into `.github/workflows/sync-bdl.yml` (1st of the
  month + manual `workflow_dispatch`). The `wojewodztwa` SHP + `seed-voivodeships.ts` stay
  uncommitted (run once against each DB by hand). WetGIW outbreaks/ogniska (a separate, prose/PDF
  source) remain deferred.
  **Source decided (spike done 2026-06-28): `lisy.info/harmonogram.php`.** Run by Aeroklub Ziemi
  Lubuskiej with GIW - a clean structured HTML table of the current-year baiting schedule: one
  card per season, rows of `date-range | comma-separated voivodeships`. Spike scraper
  (scratchpad) parsed all 4 rows with 0 problems - dates and the 16 canonical voivodeship names
  validate cleanly. **No prose->geo, no PDF, no LLM** - far cheaper than the WetGIW portal or the
  hunting layer. (WetGIW `wetgiw.gov.pl/main/wscieklizna` was the first source checked: paginated
  news/PDF portal, prose powiat/gmina zones, same blocker that paused the hunting layer - rejected
  in favour of lisy.info. WetGIW still the only place for rabies *outbreaks/ogniska*, deferred.)
  **Build shape (decided):**
  - Table `vaccination_campaign { year, startDate, endDate, voivodeship }` (one row per
    voivodeship per date-range; the page lists names only, no finer area).
  - **Granularity: voivodeship + banner only** - no rendered map polygon. Load the 16 national
    voivodeship polygons fresh (GUS/PRG SHP -> PostGIS via `shp2pgsql`) purely for a
    point-in-voivodeship lookup of the user's location.
  - **Display window: campaign active when `today` in `[startDate - 14d, endDate + 14d]`.**
    Advisory banner only ("trwa akcja szczepień lisów - nie dotykaj przynet, trzymaj psa na
    smyczy"), informational - **NOT a RED trigger**, deliberately not scored (like KMZB advisories).
  - **Sync: monthly cron** (`/api/cron/sync-lisy`-ish) re-scrapes the page; picks up mid-year
    schedule edits. zod-validate the scraped rows; an empty/failed scrape must not wipe the table.
  - Season label parsing has a known nested-`<div>` boundary bug in the spike - irrelevant
    (activity is date-driven), real parser splits on `<h2>`.
  Safety: dates carry a validity window -> lifecycle expiry, not a static layer; stale/missing
  resolves to caution (missing != safe), never imply "clear". Branch: `feature/vaccinations`.
- ~~**KMZB sync (Krajowa Mapa Zagrożeń Bezpieczeństwa).**~~ Done (display layer): background cron
  (`/api/cron/sync-kmzb`, daily) into `kmzb_report`, shown as a distinct blue map layer (not mixed
  with user reports), filtered to within 10 m of `forest_area` on import. **Data source:**
  KMZB is a presentation layer on top of Geoportal's iMapLite API
  (`mapy.geoportal.gov.pl/iMapLite/`); we fetch from Geoportal directly, not from the KMZB portal
  (the portal's automation ban in §8.2 of KMZB regulations governs the portal wrapper, not the
  underlying API). Geoportal data is not copyright-protected (public government data, Polish
  copyright law art. 4.2) and may be republished with attribution (source + download date stored
  per row). The API uses EPSG:2180, clusters above ~4k features - tiled + subdivided;
  zod-validated in `src/shared/lib/kmzb/`; PostGIS reprojects to 4326 via `ST_Transform` on
  insert. An empty fetch refuses to wipe the table (missing != safe). The two danger-relevant
  types (kłusownictwo, wypalanie traw) drive a cautionary advisory in the safety assistant (call
  police), deliberately NOT scored. **Remaining:** feed police-verified incidents into
  `assessRisk` with higher trust weight than anonymous tips; register the daily cron in the
  Vercel config.

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

- ~~**Saved areas + push notifications.**~~ `[survey: top retention ask]` Done (MVP): a visitor
  bookmarks areas (per anonymous `visitorId`) and opts into Web Push. The `notify-areas` cron runs
  after each BDL sync, re-assesses every saved area against local PostGIS, and pushes **onset-only**
  when a RED hazard newly appears (entry ban or fire-hazard degree III) - never an "all clear"
  (safety rule). Alerts are scoped to the user's own area, per the survey constraint. See
  `docs/adr/0005-web-push-notifications.md`. **Deferred to a later pass:** new-report-cluster
  alerts (needs a count/recency threshold + noise handling), and trip-planning lead-time alerts.
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
  `[survey: re-rank up]` Offline / no cell coverage was the **top friction blocker** in the
  survey ("there's often no signal in the forest - it would have to work offline"; "where I live
  and in the forest I have no coverage, the app would be useless"). Closer to a precondition for
  the core use case than a deferred extra. Minimum viable step: PWA shell + cache the last-known
  status/risk for saved areas so the app still shows something useful with no signal, before the
  full offline-tiles work.
- **Weather-based fire risk prediction.** Temperature + humidity + wind could forecast fire
  hazard before official BDL sync. Deferred because predicting independently risks contradicting
  official data - dangerous for a safety app. Revisit as a "trend indicator" with heavy
  disclaimers only after the core proactive features ship.
- **Windthrow / high-wind warning.** `[survey: named by frequent users]` A few respondents avoid
  the forest in strong wind (falling branches/trees). A plain high-wind advisory from a weather
  feed is lower-risk than fire prediction (it doesn't contradict LP data) and maps to a real
  hazard. Advisory layer, not a RED trigger.
