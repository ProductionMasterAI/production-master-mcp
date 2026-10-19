/**
 * The whole value must be decimal digits naming a port in 1..65535 —
 * `Number.parseInt` alone would read "8080junk" and "8080.5" as 8080.
 * Surrounding whitespace is rejected rather than trimmed: it only gets there
 * through a quoting mistake, and silently accepting it would hide that the
 * value is not what the operator thinks it is.
 */
function parsePort(name: string, raw: string): number {
  const port = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer port from 1 to 65535, got "${raw}"`);
  }
  return port;
}

/**
 * HTTP port for the Streamable HTTP transport (`POST /mcp`).
 *
 * `PM_MCP_HTTP_PORT` wins when set; otherwise `PORT`, the variable container
 * platforms such as Cloud Run inject to tell the process where to listen;
 * otherwise 3000. An empty value counts as unset. The app-specific variable
 * outranks the generic one so a
 * stray `PORT` in a developer's shell never silently overrides an explicit
 * choice.
 */
export function getHttpPort(): number {
  const explicit = process.env.PM_MCP_HTTP_PORT;
  if (explicit) return parsePort('PM_MCP_HTTP_PORT', explicit);
  const platform = process.env.PORT;
  if (platform) return parsePort('PORT', platform);
  return 3000;
}

/**
 * Interface the Streamable HTTP transport binds. Every interface, because the
 * transport's job is to be reached from outside its own host or container —
 * a container platform routes traffic to the container's external interface,
 * never to its loopback.
 */
export const HTTP_HOST = '0.0.0.0';

/**
 * The bearer the stdio transport forwards on every tool call for the
 * lifetime of the process. Unlike the HTTP transport (one bearer per
 * request, read from the caller's `Authorization` header), a local stdio
 * server has exactly one caller for its whole run, so the bearer is fixed at
 * startup. Required, no fallback: a stdio server started without a session
 * cannot silently behave as though it had one (no silent/empty failure
 * paths) — every tool call would otherwise reach the hosted service
 * unauthenticated and fail confusingly deep in the request path instead of
 * at startup.
 */
export function getStdioSessionBearer(): string {
  const token = process.env.PM_SESSION_JWT;
  if (!token) {
    throw new Error(
      'PM_SESSION_JWT is not set. The stdio transport needs a Production Master session ' +
        'token for its whole run — mint one and set PM_SESSION_JWT before starting the server.',
    );
  }
  return token;
}
