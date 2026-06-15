# Co w lesie

> 🇬🇧 [English version](./README.md)

Aplikacja o bezpieczeństwie w polskich lasach: zgłaszaj sytuacje, które zauważysz (strzały,
martwe/agresywne zwierzęta, wnyki, nielegalna wycinka, wysypiska) i sprawdzaj, czy w danym
miejscu można teraz bezpiecznie wejść do lasu - łącząc zgłoszenia społeczności ze strefami
zagrożenia pożarowego i zakazami wstępu Lasów Państwowych.

**To aplikacja o bezpieczeństwie** - zobacz [zasadę bezpieczeństwa](./docs/business-rules.md#safety-rule):
brak danych nigdy nie jest przedstawiany jako „bezpiecznie".

## Stack technologiczny

- **Next.js 16** (App Router, React 19, React Compiler) na Vercel
- **PostgreSQL + PostGIS** (Neon na produkcji), **Prisma 7** z `@prisma/adapter-pg`
- **MapLibre GL + PMTiles** dla mapy i ogólnopolskiej warstwy lasów (kafelki na Cloudflare R2)
- walidacja **zod**, **TanStack Query/Form**, **Zustand**, **Biome**, **Vitest**

## Uruchomienie lokalne

Wymagania: Node 22+, Docker (dla PostGIS).

```bash
# 1. Uruchom PostGIS
docker compose up -d

# 2. Skonfiguruj zmienne środowiskowe (sekcja niżej)
cp .env.example .env   # jeśli istnieje; w przeciwnym razie utwórz .env

# 3. Zastosuj migracje
npx prisma migrate deploy

# 4. Zaseeduj warstwę lasów (~455 tys. poligonów, kilka minut) i pobierz dane BDL
npm run seed:forest
npm run sync:bdl

# 5. Uruchom aplikację
npm run dev
```

Otwórz http://localhost:3000.

### Zmienne środowiskowe

| Zmienna | Wymagana | Zastosowanie |
|---|---|---|
| `DATABASE_URL` | tak | Połączenie z PostgreSQL/PostGIS (URL z poolingiem na produkcji; **bezpośredni** URL do migracji) |
| `CRON_SECRET` | tak | Sekret Bearer dla `/api/cron/*` |
| `NEXT_PUBLIC_FOREST_PMTILES_URL` | tak | URL pliku PMTiles z lasami (R2 na produkcji) |
| `NEXT_PUBLIC_SITE_URL` | prod | Kanoniczny adres witryny (metadane, sitemap, robots) |
| `NEXT_PUBLIC_SENTRY_DSN` | opcjonalna | Włącza monitoring błędów Sentry |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | opcjonalne | Trwały rate limiting (inaczej w pamięci) |
| `VOTE_SALT` | opcjonalna | Sól dla hasha głosów na zgłoszenia (per-IP) |

## Skrypty

| Skrypt | Zastosowanie |
|---|---|
| `npm run dev` / `build` / `start` | Next.js: dev / build / serwowanie |
| `npm test` | Testy jednostkowe Vitest |
| `npm run test:integration` | Testy tras na bazie danych (wymaga PostGIS; używa bazy `cowlesie_test`) |
| `npm run lint` / `format` | Biome |
| `npm run seed:forest` | Seed `forest_area` z BDL (cała Polska) |
| `npm run sync:bdl` | Synchronizacja stref pożarowych + zakazów wstępu z BDL |
| `npm run dissolve:forest` | Przebudowa scalonej geometrii lasów |
| `npm run export:forest` / `build:forest-pmtiles` | Eksport GeoJSON i budowa warstwy PMTiles |
| `npm run generate:icons` | Ponowne wygenerowanie ikon aplikacji + obrazka OG |

## Dokumentacja

Dokumentacja techniczna jest po angielsku:

- [Architecture](./docs/architecture.md) - struktura, przepływ danych przestrzennych, konwencje
- [Business rules](./docs/business-rules.md) - model ryzyka, cykl życia zgłoszeń, zasada bezpieczeństwa
- [Deployment](./docs/deployment.md) - topologia, env, migracje, cron
- [Decisions (ADRs)](./docs/adr/) - kluczowe decyzje techniczne
- [AGENTS.md](./AGENTS.md) - zasady pracy AI/współtwórców w tym repozytorium
