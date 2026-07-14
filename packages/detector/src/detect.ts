import type { CompiledSignature, Detection, PageEvidence } from "./types.js";

function matchSignature(
  sig: CompiledSignature,
  ev: PageEvidence,
): string | null {
  for (const h of sig.headers) {
    const value = ev.headers[h.name];
    if (value !== undefined && (h.pattern === null || h.pattern.test(value))) {
      return `header:${h.name}`;
    }
  }
  for (const c of sig.cookies) {
    if (c.pattern === null && ev.cookieNames.includes(c.name)) {
      return `cookie:${c.name}`;
    }
  }
  for (const re of sig.scriptSrc) {
    for (const src of ev.scriptSrcs) {
      if (re.test(src)) return `scriptSrc:${re.source}`;
    }
  }
  for (const re of sig.html) {
    if (re.test(ev.html)) return `html:${re.source}`;
  }
  return null;
}

export function detectPage(
  ev: PageEvidence,
  signatures: CompiledSignature[],
): Detection[] {
  const detections: Detection[] = [];
  const seen = new Set<string>();

  for (const sig of signatures) {
    const proof = matchSignature(sig, ev);
    if (proof && !seen.has(sig.name)) {
      seen.add(sig.name);
      detections.push({
        technology: sig.name,
        categories: sig.categories,
        evidence: proof,
      });
    }
  }

  const byName = new Map(signatures.map((s) => [s.name, s]));
  const queue = detections.map((d) => d.technology);
  while (queue.length > 0) {
    const name = queue.shift()!;
    for (const implied of byName.get(name)?.implies ?? []) {
      if (seen.has(implied)) continue;
      const sig = byName.get(implied);
      if (!sig) continue;
      seen.add(implied);
      detections.push({
        technology: implied,
        categories: sig.categories,
        evidence: `implied-by:${name}`,
      });
      queue.push(implied);
    }
  }

  return detections;
}
