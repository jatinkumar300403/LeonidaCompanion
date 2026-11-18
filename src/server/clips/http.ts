import "server-only";

/**
 * HTTP for the platform APIs (metadata only: JSON, never video, CLAUDE.md rule 1). Every call has
 * a timeout so a slow platform can't hang a submission or a cron run.
 */
export type PlatformFetch = (input: string, init?: RequestInit) => Promise<Response>;

export const PLATFORM_TIMEOUT_MS = 5000;

/** The platform didn't answer usefully: network error, timeout, 5xx or a body that isn't JSON. */
export class UpstreamError extends Error {
  constructor(
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export type JsonResponse = { status: number; body: unknown };

/** GET/POST returning the status and parsed JSON body. 4xx bodies are returned, not thrown. */
export async function fetchJson(fetchImpl: PlatformFetch, url: string, init: RequestInit = {}): Promise<JsonResponse> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(PLATFORM_TIMEOUT_MS),
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "error";
    throw new UpstreamError(null, `${new URL(url).host} request failed (${reason})`);
  }
  if (response.status >= 500)
    throw new UpstreamError(response.status, `${new URL(url).host} answered ${response.status}`);
  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (response.ok) throw new UpstreamError(response.status, `${new URL(url).host} sent a body that isn't JSON`);
    }
  }
  return { status: response.status, body };
}
