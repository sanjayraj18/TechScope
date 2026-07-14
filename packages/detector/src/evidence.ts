import type { PageEvidence } from "./types.js";

const SCRIPT_SRC_RE = /<script[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi;

export function buildEvidence(page: {
  html: string | null;
  headers: Record<string, string>;
  setCookies: string[];
}): PageEvidence {
  const html = page.html ?? "";

  const scriptSrcs: string[] = [];
  for (const m of html.matchAll(SCRIPT_SRC_RE)) {
    scriptSrcs.push(m[1]);
  }

  const cookieNames = page.setCookies
    .map((c) => c.split("=")[0].trim().toLowerCase())
    .filter(Boolean);

  return { html, scriptSrcs, headers: page.headers, cookieNames };
}
