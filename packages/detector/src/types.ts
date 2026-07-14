export interface RawSignature {
  cats: number[];
  website: string;
  description?: string;
  scriptSrc?: string | string[];
  html?: string | string[];
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  implies?: string | string[];
  [key: string]: unknown;
}

export interface CompiledSignature {
  name: string;
  categories: number[];
  scriptSrc: RegExp[];
  html: RegExp[];
  headers: { name: string; pattern: RegExp | null }[];
  cookies: { name: string; pattern: RegExp | null }[];
  implies: string[];
}

export interface PageEvidence {
  html: string;
  scriptSrcs: string[];
  headers: Record<string, string>;
  cookieNames: string[];
}

export interface Detection {
  technology: string;
  categories: number[];
  evidence: string;
}
