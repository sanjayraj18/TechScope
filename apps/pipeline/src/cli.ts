import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { fetchPage } from "./fetchPage.js";
import { runPool } from "./pool.js";

const CONCURRENCY = 50;
const [listPath, outPath = "crawl.-results.jsonl"] = process.argv.slice(2);
if (!listPath) {
  console.error("There is no input file");
  process.exit();
}

const domains = (await readFile(listPath, "utf-8"))
  .split("\n")
  .map((d) => d.trim())
  .filter(Boolean);

console.log(`crawling ${domains.length} domains, concurrency=${CONCURRENCY}`);

const started = Date.now();
const out = createWriteStream(outPath, { flags: "a" });
const counts: Record<string, number> = {};

await runPool(domains, CONCURRENCY, fetchPage, (result, done, total) => {
  counts[result.status] = (counts[result.status] ?? 0) + 1;

  const json = JSON.stringify(result).replace(/[\u2028\u2029]/g, (c) =>
    c === "\u2028" ? "\\u2028" : "\\u2029",
  );
  out.write(json + "\n");

  if (done % 100 == 0 && done == total) {
    console.log(`${done}/${total}`, JSON.stringify(counts));
  }
});

out.end();

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`done in ${secs}s:`, JSON.stringify(counts, null, 2));
