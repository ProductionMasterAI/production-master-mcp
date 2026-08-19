import { getApiBaseUrl } from './config.js';

/**
 * Why a distinct code per failure class rather than one `upstream_failed`:
 * a caller has to be able to tell "your token is not valid" from "the hosted
 * service is down" from "that investigation does not exist" without parsing
 * prose. Every one of these is also distinguishable from a *successful* call
 * that happens to return nothing — an empty list and a dead upstream must
 * never produce the same tool result.
 */
export type UpstreamErrorCode =
  | 'upstream_unauthorized'
  | 'upstream_forbidden'
  | 'upstream_not_found'
  | 'upstream_rate_limited'
  | 'upstream_failed'
  | 'upstream_unreachable'
  | 'upstream_invalid_response';

export interface UpstreamFailure {
  ok: false;
  status: number;
  error: UpstreamErrorCode;
  message?: string;
}

export interface UpstreamSuccess<T> {
  ok: true;
  data: T;
}

export type UpstreamResult<T> = UpstreamSuccess<T> | UpstreamFailure;

/** Longest upstream-supplied detail we relay; a hostile or broken upstream does not get to flood a tool result. */
const MAX_DETAIL_LENGTH = 400;

/**
 * Removes the forwarded bearer from any text this server is about to return
 * or log. Defense in depth, and the one place it genuinely earns its keep:
 * the *upstream* is not our code, so a broken or hostile hosted endpoint can
 * echo the `Authorization` header back inside its own error body. Relaying
 * that body verbatim would leak the caller's credential into a tool result
 * and, from there, into a client transcript. We still relay upstream detail
 * — diagnosability matters — but never the token that reached it.
 *
 * `split`/`join` rather than a `RegExp`: a token is arbitrary text and would
 * otherwise need escaping to be safe as a pattern.
 */
export function scrubToken(text: string, bearer: string): string {
  if (!bearer) return text;
  return text.split(bearer).join('[redacted]');
}

function truncate(text: string): string {
  return text.length > MAX_DETAIL_LENGTH ? `${text.slice(0, MAX_DETAIL_LENGTH)}…` : text;
}

function codeForStatus(status: number): UpstreamErrorCode {
  switch (status) {
    case 401:
      return 'upstream_unauthorized';
    case 403:
      return 'upstream_forbidden';
    case 404:
      return 'upstream_not_found';
    case 429:
      return 'upstream_rate_limited';
    default:
      return 'upstream_failed';
  }
}

/**
 * Best-effort detail from a failed upstream response, always scrubbed.
 * Reading the body can itself fail (connection dropped mid-response); that is
 * not worth failing the call over, since we already know the request failed.
 */
async function detailFromResponse(res: Response, bearer: string): Promise<string | undefined> {
  let raw: string;
  try {
    raw = await res.text();
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  return truncate(scrubToken(raw, bearer));
}

/**
 * Describes a transport-level failure without echoing the thrown error's own
 * message. `fetch` rejects with a `TypeError` whose `cause` carries the
 * useful part (`ECONNREFUSED`, `ENOTFOUND`, …) as a short code; that code is
 * what a user needs, and taking only it means no arbitrary error text — from
 * a layer we do not control — can reach a tool result or a log line.
 */
function describeTransportError(error: unknown): string {
  const cause = (error as { cause?: unknown })?.cause;
  const code = (cause as { code?: unknown })?.code;
  return typeof code === 'string' && code ? code : 'connection failed';
}

/**
 * The one place this server talks to the hosted service. Every `/v1/*` call
 * goes through here so the pass-through-auth contract and the failure
 * taxonomy are stated once and cannot drift between the twenty tools.
 *
 * @param bearer the caller's own session token, forwarded verbatim and never
 *   stored, cached, logged, or echoed back (AD-23 §5)
 */
export async function requestUpstream<T = unknown>(
  bearer: string,
  path: string,
  init: RequestInit = {},
): Promise<UpstreamResult<T>> {
  // Resolved outside the try on purpose: an unset `PM_API_URL` is a
  // configuration fault, not a network fault, and must not be reported as
  // `upstream_unreachable`. It propagates as the explicit startup-style error
  // `getApiBaseUrl` throws.
  const url = `${getApiBaseUrl()}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        // Opaque-bearer forwarding (AD-23 §5): this server never inspects or
        // verifies the token, it only relays it. The hosted service is the
        // one party that resolves identity and enforces investigation/mutate
        // scope — duplicating that check here would need `PM_JWT_SECRET`,
        // which this public, zero-secret repo must never hold.
        authorization: `Bearer ${bearer}`,
        ...(init.headers ?? {}),
      },
    });
  } catch (error: unknown) {
    // A dead upstream is a failure, never an empty success. 502 rather than
    // the caller's own status: the relay reached no one, so there is no
    // upstream status to report.
    return {
      ok: false,
      status: 502,
      error: 'upstream_unreachable',
      message: `could not reach the Production Master API (${describeTransportError(error)})`,
    };
  }

  if (!res.ok) {
    const detail = await detailFromResponse(res, bearer);
    return {
      ok: false,
      status: res.status,
      error: codeForStatus(res.status),
      ...(detail ? { message: detail } : {}),
    };
  }

  // A 204, or any 2xx with no body, is a legitimate empty *success* — the
  // one case where "nothing came back" is the honest answer rather than a
  // masked failure. Classifying it as a broken response would be the same
  // defect in the other direction: a false alarm on a healthy upstream.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return { ok: true, data: {} as T };
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    // A 200 whose body is not JSON is a broken upstream, not an empty result.
    return {
      ok: false,
      status: 502,
      error: 'upstream_invalid_response',
      message: 'the Production Master API returned a body that is not valid JSON',
    };
  }
}
