import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { pool } from "./client.js";

// ── chunk 1: args + the crawl row ────────────────────────────────

const [crawlPath, detectionsPath] = process.argv.slice(2);
if (!crawlPath || !detectionsPath) {
  console.error("usage: npx tsx src/load.ts <crawl.jsonl> <detections.jsonl>");
  process.exit(1);
}

const lines = (path: string) =>
  createInterface({ input: createReadStream(path) });

const {
  rows: [crawl],
} = await pool.query("insert into crawls default values returning id");
console.log(`crawl id: ${crawl.id}`);

// ── chunk 2: resolvers — name → id, upserted once, cached forever ─

const domainIds = new Map<string, number>();
async function domainId(name: string): Promise<number> {
  const cached = domainIds.get(name);
  if (cached !== undefined) return cached;
  const { rows } = await pool.query(
    `insert into domains (name) values ($1)
       on conflict (name) do update set name = excluded.name
       returning id`,
    [name],
  );
  domainIds.set(name, rows[0].id);
  return rows[0].id;
}

const techIds = new Map<string, number>();
async function technologyId(
  name: string,
  categories: number[],
): Promise<number> {
  const cached = techIds.get(name);
  if (cached !== undefined) return cached;
  const { rows } = await pool.query(
    `insert into technologies (name, categories) values ($1, $2)
       on conflict (name) do update set categories = excluded.categories
       returning id`,
    [name, categories],
  );
  techIds.set(name, rows[0].id);
  return rows[0].id;
}

// ── chunk 3: crawl file → page_fetches ───────────────────────────

let fetches = 0;
for await (const line of lines(crawlPath)) {
  if (!line.trim()) continue;
  const p = JSON.parse(line);
  const dId = await domainId(p.domain);
  await pool.query(
    `insert into page_fetches
         (crawl_id, domain_id, status, http_status, duration_ms, error)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (crawl_id, domain_id) do nothing`,
    [crawl.id, dId, p.status, p.httpStatus, p.durationMs, p.error],
  );
  fetches++;
}
console.log(`page_fetches: ${fetches}`);

// ── chunk 4: detections file → detections, batched ───────────────

const BATCH_SIZE = 1000;
let batch: { d: number; t: number; e: string | null }[] = [];
let detections = 0;

async function flush() {
  if (batch.length === 0) return;
  await pool.query(
    `insert into detections (crawl_id, domain_id, technology_id, evidence)
       select $1, d, t, e
       from unnest($2::int[], $3::int[], $4::text[]) as x(d, t, e)
       on conflict do nothing`,
    [
      crawl.id,
      batch.map((b) => b.d),
      batch.map((b) => b.t),
      batch.map((b) => b.e),
    ],
  );
  detections += batch.length;
  batch = [];
}

for await (const line of lines(detectionsPath)) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  const dId = await domainId(rec.domain);
  for (const det of rec.technologies) {
    const tId = await technologyId(det.technology, det.categories ?? []);
    batch.push({ d: dId, t: tId, e: det.evidence ?? null });
    if (batch.length >= BATCH_SIZE) await flush();
  }
}
await flush();
console.log(`detections: ${detections}`);

// ── chunk 5: mark the crawl finished ─────────────────────────────

await pool.query("update crawls set finished_at = now() where id = $1", [
  crawl.id,
]);
console.log(`crawl ${crawl.id} finished`);
await pool.end();
