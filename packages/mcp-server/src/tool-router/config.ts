/**
 * The single public origin for the hosted Production Master REST + SSE
 * surface (`/v1/*`). Collapsing to one public origin — rather than the
 * private deployment's several internal service URLs — is deliberate: this
 * repo is public, so it must never encode internal topology (AD-23 design,
 * "Router upstream base collapses ... to one public origin").
 *
 * Required, no built-in default: a wrong guessed default would silently
 * point every tool call at a domain this project may not even control. Fail
 * loudly instead (no silent/empty failure paths).
 */
export function getApiBaseUrl(): string {
  const url = process.env.PM_API_URL;
  if (!url) {
    throw new Error(
      'PM_API_URL is not set. Configure it to the Production Master public API origin ' +
        '(the hosted service\'s /v1/* base URL) before starting the server.',
    );
  }
  return url.replace(/\/+$/, '');
}
