import { pool } from "./client.js";

// ── chunk 1: pick the two snapshots to compare ───────────────────
// Only finished crawls qualify — a half-loaded run is not a snapshot.

const { rows: recent } = await pool.query(
  `select id from crawls
     where finished_at is not null
     order by id desc
     limit 2`,
);

if (recent.length < 2) {
  console.log(
    "need at least 2 finished crawls to diff — run the pipeline again first",
  );
  process.exit(0);
}

const [curr, prev] = [recent[0].id, recent[1].id];
console.log(`diffing crawl ${prev} → ${curr}`);

// ── chunk 2: guard rail — domains fetched ok in BOTH crawls ──────
// Absence of a detection only means something if we actually looked
// (and succeeded) on both sides. $1 = current crawl, $2 = previous.

const OK_IN_BOTH = `
    select f1.domain_id
    from page_fetches f1
    join page_fetches f2 on f2.domain_id = f1.domain_id
      and f2.crawl_id = $2 and f2.status = 'ok'
    where f1.crawl_id = $1 and f1.status = 'ok'
  `;

// ── chunk 3: added = in current, not in previous ─────────────────

const added = await pool.query(
  `insert into tech_events (domain_id, technology_id, event_type, crawl_id)
     select d.domain_id, d.technology_id, 'added', $1
     from (
       select domain_id, technology_id from detections where crawl_id = $1
       except
       select domain_id, technology_id from detections where crawl_id = $2
     ) d
     where d.domain_id in (${OK_IN_BOTH})
     on conflict do nothing`,
  [curr, prev],
);

// ── chunk 4: removed = in previous, not in current (mirror) ──────

const removed = await pool.query(
  `insert into tech_events (domain_id, technology_id, event_type, crawl_id)
     select d.domain_id, d.technology_id, 'removed', $1
     from (
       select domain_id, technology_id from detections where crawl_id = $2
       except
       select domain_id, technology_id from detections where crawl_id = $1
     ) d
     where d.domain_id in (${OK_IN_BOTH})
     on conflict do nothing`,
  [curr, prev],
);

console.log(`events: ${added.rowCount} added, ${removed.rowCount} removed`);
await pool.end();
