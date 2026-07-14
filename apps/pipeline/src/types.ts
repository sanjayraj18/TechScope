export type FetchStatus =
  | "ok"
  | "timeout"
  | "http_error"
  | "dns_error"
  | "blocked"
  | "fetch_error";

export interface PageFetch {
  domain: string;
  status: FetchStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  html: string | null;
  headers: Record<string, string>;
  setCookies: string[];
  fetchedAt: string;
  durationMs: number;
  error: string | null;
}
