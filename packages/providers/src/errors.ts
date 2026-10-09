import { ProviderError, isProviderError, type ProviderErrorKind, type Usage } from "@media-studio/core";

/** HTTP status → error kind, shared by every adapter (raw REST and SDK errors alike). */
export function kindForStatus(status: number): ProviderErrorKind {
  if (status === 401 || status === 402 || status === 403) return "config";
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return "retryable";
  return "fatal";
}

const NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

const TRANSIENT_NAMES = new Set(["AbortError", "TimeoutError", "APIConnectionError", "APIConnectionTimeoutError", "FetchError"]);

function prop(err: unknown, key: string): unknown {
  return err !== null && typeof err === "object" ? (err as Record<string, unknown>)[key] : undefined;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Numeric HTTP status carried by SDK errors (`status`, `statusCode`, `response.status`). */
export function statusOf(err: unknown): number | null {
  for (const candidate of [prop(err, "status"), prop(err, "statusCode"), prop(prop(err, "response"), "status")]) {
    if (typeof candidate === "number" && candidate >= 100 && candidate < 600) return candidate;
  }
  return null;
}

export function isTransientError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 4; depth++) {
    const name = prop(current, "name");
    const code = prop(current, "code");
    if (typeof name === "string" && TRANSIENT_NAMES.has(name)) return true;
    if (typeof code === "string" && NETWORK_CODES.has(code)) return true;
    const message = errorMessage(current);
    if (/fetch failed|socket hang up|network error|timed? ?out|overloaded/i.test(message)) return true;
    current = prop(current, "cause");
  }
  return false;
}

export interface ErrorContext {
  /** Short description of the call, e.g. "video submit". */
  operation?: string;
  usage?: Usage[];
  /** Vendor-specific signal that the failure was a content-policy refusal. */
  blockedPattern?: RegExp;
}

/** Normalise anything thrown by a vendor SDK / fetch into a ProviderError. */
export function toProviderError(provider: string, err: unknown, ctx: ErrorContext = {}): ProviderError {
  if (isProviderError(err)) return err;
  const message = errorMessage(err);
  const status = statusOf(err);
  let kind: ProviderErrorKind;
  if (ctx.blockedPattern && ctx.blockedPattern.test(message)) kind = "blocked";
  else if (status !== null) kind = kindForStatus(status);
  else if (isTransientError(err)) kind = "retryable";
  else kind = "fatal";
  const where = ctx.operation ? ` ${ctx.operation}` : "";
  const code = status !== null ? ` (HTTP ${status})` : "";
  return new ProviderError(`${provider}${where} failed${code}: ${message}`, {
    kind,
    provider,
    usage: ctx.usage,
    cause: err,
  });
}

export function configError(provider: string, message: string): ProviderError {
  return new ProviderError(message, { kind: "config", provider });
}
