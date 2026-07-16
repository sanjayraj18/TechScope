import { FetchStatus, PageFetch } from "./types.js";

const USER_AGENT =
  "TechScopeBot/0.1 (+https://github.com/sanjayraj18/techscope; research project)";
const TIMEOUT_MS = 10000;
const MAX_BODY_BYTES = 2_000_000;

export async function fetchPage(domain: string) {
  const started = Date.now();

  const base: Omit<PageFetch, "status" | "error"> = {
    domain,
    httpStatus: null,
    finalUrl: null,
    html: null,
    headers: {},
    setCookies: [],
    fetchedAt: new Date().toISOString(),
    durationMs: 0,
  };

  const fail = (status: FetchStatus, error: string): PageFetch => ({
    ...base,
    status,
    error,
    durationMs: Date.now() - started,
  });

  try {
    const res = await fetch(`https://${domain}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));

    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;

      if (received > MAX_BODY_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(Buffer.concat(chunks)); // bytes → string

    return {
      ...base,
      status:
        res.status === 403 || res.status === 429
          ? "blocked"
          : res.ok
            ? "ok"
            : "http_error",
      httpStatus: res.status,
      finalUrl: res.url,
      html: res.ok ? html : null,
      headers,
      setCookies: res.headers.getSetCookie(),
      error: null,
      durationMs: Date.now() - started,
    };
  } catch (err: any) {
    const msg = String(err?.cause?.code ?? err?.name ?? err);

    if (msg.includes("Timeout")) return fail("timeout", msg);
    if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN"))
      return fail("dns_error", msg);
    return fail("fetch_error", msg);
  }
}
