/** HTTP port for the Streamable HTTP transport (`POST /mcp`). */
export function getHttpPort(): number {
  const raw = process.env.PM_MCP_HTTP_PORT;
  if (!raw) return 3000;
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PM_MCP_HTTP_PORT must be a positive integer, got "${raw}"`);
  }
  return port;
}

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
