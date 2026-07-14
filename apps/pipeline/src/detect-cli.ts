import { buildEvidence, detectPage, loadSignatures } from "@techscope/detector";
import { createReadStream, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { PageFetch } from "./types.js";

const [inPath, outPath = "detections.jsonl"] = process.argv.slice(2);
if (!inPath) {
  console.error("usage: npx tsx src/detect-cli.ts <crawl.jsonl> [out.jsonl]");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const catalogDir = join(here, "../../../packages/detector/data/technologies");

const { signatures, technologies, skippedPatterns } =
  loadSignatures(catalogDir);
console.log(
  `catalog: ${technologies} technologies (${skippedPatterns} patterns skipped)`,
);

const rl = createInterface({ input: createReadStream(inPath) });
const out = createWriteStream(outPath, { flags: "a" });
let pages = 0,
  detectedPages = 0;
const techCounts: Record<string, number> = {};

for await (const line of rl) {
  if (!line.trim()) continue;
  pages++;
  const page: PageFetch = JSON.parse(line);
  if (page.status !== "ok" || !page.html) continue;

  const detections = detectPage(buildEvidence(page), signatures);
  detectedPages++;
  for (const d of detections) {
    techCounts[d.technology] = (techCounts[d.technology] ?? 0) + 1;
  }
  out.write(
    JSON.stringify({
      domain: page.domain,
      fetchedAt: page.fetchedAt,
      technologies: detections,
    }) + "\n",
  );
}
out.end();

console.log(`pages read: ${pages}, pages analyzed: ${detectedPages}`);
console.log("\ntop 20 technologies in your crawl:");
for (const [name, n] of Object.entries(techCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)) {
  console.log(String(n).padStart(5), name);
}
