import { ProviderError, type Usage } from "@media-studio/core";
import { kindForStatus, toProviderError } from "./errors";

export interface HttpOptions {
  provider: string;
  operation: string;
  fetch: typeof fetch;
  timeoutMs?: number;
  /** Matched against the vendor's error message to detect content-policy refusals. */
  blockedPattern?: RegExp;
  /** Billed usage to attach when the call fails as `blocked` (e.g. xAI's moderation fee). */
  blockedUsage?: Usage[];
  /** Pull a human-readable message out of the vendor's error body. */
  errorMessage?: (body: unknown, text: string) => string | null;
}

export interface HttpResult<T> {
  status: number;
  headers: Headers;
  body: T;
}

function defaultErrorMessage(body: unknown, text: string): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const err = b.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && typeof (err as Record<string, unknown>).message === "string") {
      return (err as Record<string, unknown>).message as string;
    }
    if (typeof b.message === "string") return b.message;
    if (typeof b.detail === "string") return b.detail;
    if (b.detail && typeof b.detail === "object") return JSON.stringify(b.detail);
  }
  return text.slice(0, 500) || "empty response";
}

/** fetch + JSON with vendor error classification. Non-2xx responses throw ProviderError. */
export async function requestJson<T>(url: string, init: RequestInit, opts: HttpOptions): Promise<HttpResult<T>> {
  let res: Response;
  try {
    res = await opts.fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 120_000) });
  } catch (err) {
    throw toProviderError(opts.provider, err, { operation: opts.operation });
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const message = (opts.errorMessage ?? defaultErrorMessage)(body, text) ?? defaultErrorMessage(body, text);
    const blocked = opts.blockedPattern?.test(message) ?? false;
    throw new ProviderError(`${opts.provider} ${opts.operation} failed (HTTP ${res.status}): ${message}`, {
      kind: blocked ? "blocked" : kindForStatus(res.status),
      provider: opts.provider,
      usage: blocked ? opts.blockedUsage : undefined,
    });
  }
  if (text && body === null) {
    throw new ProviderError(`${opts.provider} ${opts.operation} returned non-JSON: ${text.slice(0, 200)}`, {
      kind: "retryable",
      provider: opts.provider,
    });
  }
  return { status: res.status, headers: res.headers, body: body as T };
}

/** Encode job metadata needed at poll time (resolution, image count) into the opaque job id. */
export function encodeJobId(vendorId: string, meta: Record<string, string | number>): string {
  const params = new URLSearchParams(Object.entries(meta).map(([k, v]): [string, string] => [k, String(v)]));
  return `${vendorId}?${params.toString()}`;
}

export function decodeJobId(jobId: string): { vendorId: string; meta: URLSearchParams } {
  const at = jobId.indexOf("?");
  if (at < 0) return { vendorId: jobId, meta: new URLSearchParams() };
  return { vendorId: jobId.slice(0, at), meta: new URLSearchParams(jobId.slice(at + 1)) };
}
