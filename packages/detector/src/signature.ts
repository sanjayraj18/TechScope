import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CompiledSignature, RawSignature } from "./types.js";

function cleanPattern(raw: string): string {
  return raw.split("\\;")[0];
}

function compile(raw: string) {
  try {
    return new RegExp(cleanPattern(raw), "i");
  } catch {
    return null;
  }
}

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) {
    return [];
  }
  return Array.isArray(v) ? v : [v];
}

export interface LoadResult {
  signatures: CompiledSignature[];
  technologies: number; // entries seen in the catalog
  skippedPatterns: number; // patterns dropped as invalid
}

export function loadSignatures(dir: string): LoadResult {
  const signatures: CompiledSignature[] = [];
  let technologies = 0;
  let skippedPatterns = 0;

  const compileAll = (patterns: string[]): RegExp[] => {
    const out: RegExp[] = [];
    for (const p of patterns) {
      const re = compile(p);
      if (re) out.push(re);
      else skippedPatterns++;
    }
    return out;
  };

  const compileNamed = (map: Record<string, string> | undefined) => {
    const out: { name: string; pattern: RegExp | null }[] = [];
    for (const [name, p] of Object.entries(map ?? {})) {
      if (p === "") {
        out.push({ name: name.toLowerCase(), pattern: null });
      } else {
        const re = compile(p);
        if (re) out.push({ name: name.toLowerCase(), pattern: re });
        else skippedPatterns++;
      }
    }
    return out;
  };

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const entries: Record<string, RawSignature> = JSON.parse(
      readFileSync(join(dir, file), "utf8")
    );
    for (const [name, raw] of Object.entries(entries)) {
      technologies++;
      signatures.push({
        name,
        categories: raw.cats ?? [],
        scriptSrc: compileAll(toArray(raw.scriptSrc)),
        html: compileAll(toArray(raw.html)),
        headers: compileNamed(raw.headers),
        cookies: compileNamed(raw.cookies),
        implies: toArray(raw.implies).map((i) => i.split("\\;")[0]),
      });
    }
  }

  return { signatures, technologies, skippedPatterns };
}
