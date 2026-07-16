# TechScope

A miniature web-technographics pipeline: it crawls popular websites daily, detects the technologies each one runs (analytics, payments, frameworks, CDNs), stores point-in-time snapshots in PostgreSQL, and computes a change feed — *which sites added or removed which technologies* — the signal that powers products like MixRank, BuiltWith, and Wappalyzer.

Built as a learning project to understand technographics pipelines end to end: crawling politely at scale, signature-based detection, temporal schema design, and diff computation.

## What it produces

Every day, rows like these:

```
site            technology         change     detected
stripe.com      Intercom           + added    2026-07-16
nytimes.com     Google Analytics   − removed  2026-07-16
```

Individual detections are commodity data. The *changes* are the product: "500 sites dropped X this quarter" is a competitive signal you cannot get from a single snapshot.

## Architecture

```
                         daily (GitHub Actions cron)
        ┌──────────────────────────────────────────────────────┐
        │   domain list (Tranco)                               │
        │        │                                             │
        │        ▼                                             │
        │   CRAWLER ──── homepage HTML + headers + cookies     │
        │        │       (bounded: 10s timeout, 2MB cap,       │
        │        │        50 concurrent, honest User-Agent)    │
        │        ▼                                             │
        │   DETECTOR ─── ~7,500 signatures (Wappalyzer data)   │
        │        │       matched against script URLs, HTML,    │
        │        │       headers, cookies + implies-cascade    │
        │        ▼                                             │
        │   LOADER ───── batched upserts into PostgreSQL       │
        │        ▼                                             │
        │   DIFFER ───── SQL set-difference between the two    │
        │                newest finished crawls → tech_events  │
        └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
                     PostgreSQL (Neon, 6 tables)
                                  │
                                  ▼
                     Next.js explorer (dashboard,
                     per-technology & per-site pages)
```

### Monorepo layout

| package | role |
|---|---|
| `apps/pipeline` | crawler CLI + detector CLI (streaming JSONL between stages) |
| `packages/detector` | pure detection library: signature compiler + matching engine, no I/O in the hot path |
| `packages/db` | schema migrations, loader, differ |
| `apps/web` | Next.js 16 explorer (server components, shadcn/ui) |

### Data model

Two dictionary tables (`domains`, `technologies`) give every entity a stable integer id. `crawls` gives every pipeline run an identity, so all data is point-in-time addressable. `page_fetches` records the outcome of every fetch — including failures — which is what lets the differ distinguish "technology removed" from "we failed to look." `detections` is the big fact table (three integers per row + matched-rule evidence for debuggability). `tech_events` is the materialized change feed.

## Measured results (current state)

Tracking the Tranco top 500 daily. From the latest crawl:

| metric | value |
|---|---|
| domains crawled | 500 |
| successful fetches | 272 (54%) |
| distinct technologies observed | 210 |
| detections in latest snapshot | ~2,900 |
| change events captured so far | 62 |
| avg technologies per successful site | 5.4 |

Coverage is reported honestly rather than hidden: of the failures, ~120 are `dns_error` — the Tranco top 500 is full of infrastructure hostnames (CDN edges, DNS roots, telemetry endpoints) that do not serve a homepage at all. ~31 are `blocked` (403/429): sites that refuse bots, which we identify as (`TechScopeBot/0.1` + contact URL) rather than disguise. Every failure is classified and stored, and failed fetches can never generate false "removed" events.

## Design decisions and trade-offs

Choices made deliberately, with their costs stated:

- **Static HTML only, no headless browser.** The detector runs on fetched HTML, headers, and cookies. Signatures that require a running page (`js`, `dom` rules — e.g. checking `window.Stripe`) are skipped. This is why the average detections-per-site (5.4) is lower than browser-based tools report (~15): client-side-injected technologies are invisible to us. Cost accepted for v1; the fix is a rendering tier for a sample of sites.
- **Raw HTML is discarded after detection.** Storing pages for 500–10K sites daily would exhaust the free Postgres tier within days for data that detection has already distilled. Cost: improving a signature requires a re-crawl, not a re-analysis. At real scale this decision inverts — see scaling notes below.
- **Cookie rules match on names only** (the crawler stores `Set-Cookie` names, not values), so value-matching cookie signatures are skipped. Presence-based rules (the common case) work fully.
- **Script URLs are extracted with a regex, not an HTML parser.** Acceptable because we harvest one attribute pattern, not document structure; a missed edge case costs one signature match, nothing downstream.
- **Removal debounce is designed but deferred.** The rule — only emit "removed" after absence in two consecutive successful crawls — needs a three-crawl window. Until implemented, a transient rendering flap can produce a removed/added pair on consecutive days; annoying, not corrupting.
- **Events are materialized, not computed on read.** A diff is computed once per day but read constantly; storing `tech_events` decouples the feed's lifetime from the (prunable) snapshot tables.

## How this would scale to 80M domains

The components stay the same; their implementations change as each one breaks:

| concern | at 500–10K (this repo) | at 80M (a MixRank) |
|---|---|---|
| scheduling | GitHub Actions cron | priority scheduler + per-domain recrawl policy |
| fetching | one process, 50 concurrent lanes | worker fleet + queue with per-host rate limits |
| raw HTML | discarded after detection | object storage / distributed FS, kept for re-analysis |
| detection | inline in the crawl process | separate fleet, re-runnable over stored pages when rules change |
| storage | single Postgres, plain tables | partitioned by crawl date + sharded by domain; changes-plus-baselines instead of full snapshots |
| diffing | one SQL `EXCEPT` post-crawl | incremental per-domain compare as detections stream in |
| serving | same Postgres | read replicas / warehouse isolated from pipeline writes |

The first thing to break is the fetch loop (80M daily ≈ 900 fetches/sec sustained); the most consequential change is keeping raw pages, which splits crawling and detection into independently scalable, re-runnable stages.

## Running locally

Requires Node 26+, a PostgreSQL database (a free [Neon](https://neon.tech) instance works), and a `.env` at the repo root:

```
DATABASE_URL=postgresql://...
```

```bash
npm install

# 1. schema
npx dotenv -e .env -- npx tsx packages/db/src/migrate.ts

# 2. crawl a domain list (one domain per line)
npx tsx apps/pipeline/src/cli.ts apps/pipeline/top-500.txt crawl.jsonl

# 3. detect technologies
npx tsx apps/pipeline/src/detect-cli.ts crawl.jsonl detections.jsonl

# 4. load into Postgres
npx dotenv -e .env -- npx tsx packages/db/src/load.ts crawl.jsonl detections.jsonl

# 5. compute change events (needs two finished crawls)
npx dotenv -e .env -- npx tsx packages/db/src/differ.ts

# explorer UI
cd apps/web && npx dotenv -e ../../.env -- npm run dev
```

In production the same five steps run unattended via GitHub Actions (`.github/workflows/daily-crawl.yml`, daily at 03:30 UTC), with `DATABASE_URL` injected from repository secrets.

## Attribution

- Technology fingerprints: [webappanalyzer](https://github.com/enthec/webappanalyzer), the maintained continuation of the open-source Wappalyzer signature dataset (vendored in `packages/detector/data/`).
- Domain ranking: [Tranco](https://tranco-list.eu/), a research-grade top-sites list.

## Roadmap

- Removal debounce (two-consecutive-absence rule)
- Public JSON API over the dataset
- Headless-browser rendering tier for a sample of sites, to measure the static-only detection gap
- Category-level analytics (e.g. payment-processor market share within the tracked set)
