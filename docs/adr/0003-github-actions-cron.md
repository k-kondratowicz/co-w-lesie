# 0003 - GitHub Actions for scheduled BDL sync

**Status:** accepted

## Context

Fire-hazard zones need refreshing several times a day (BDL publishes ~09:00 & ~13:00 PL, more in
extreme conditions); bans daily. Vercel Cron on the Hobby plan is limited to ~daily, ~2 jobs -
not enough for the fire cadence. The repo already lives on GitHub.

## Decision

Use a **GitHub Actions scheduled workflow** ([`sync-bdl.yml`](../../.github/workflows/sync-bdl.yml))
that `curl`s the deployed `/api/cron/sync-bdl` endpoint with `Authorization: Bearer $CRON_SECRET`.
The endpoint itself is platform-agnostic.

## Consequences

- Sub-daily syncs without Vercel Pro, no extra vendor (already on GitHub), free tier is ample.
- Schedules are **UTC** with no DST adjustment, and runs are **best-effort** (can be minutes
  late). Fire sync therefore runs hourly across a daytime window rather than at exact times.
- Requires a repo secret `CRON_SECRET` (matching Vercel) and variable `APP_URL`.
- Alternatives if more punctuality is needed: Cloudflare Workers Cron, Upstash QStash - same
  endpoint, same bearer.
