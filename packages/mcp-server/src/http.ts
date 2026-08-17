import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerInvestigationTools } from './register-tools.js';
import { getHttpPort } from './config.js';

const METHOD_NOT_ALLOWED = {
  jsonrpc: '2.0' as const,
  error: { code: -32000, message: 'Method not allowed: /mcp is a stateless endpoint.' },
  id: null,
};

function bearerFromHeader(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw?.startsWith('Bearer ')) return null;
  const token = raw.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Handles one `POST /mcp` request. Stateless (AD-23 B3, mirroring the hosted
 * service's own standard-MCP route): a fresh `McpServer` + transport is
 * built per request rather than kept between requests, because every
 * request already carries full identity via its own bearer — there is
 * nothing to keep in a session. The bearer is read directly off this
 * request's `Authorization` header and never touches disk, a log line, or
 * any other request's closure.
 */
async function handleMcpPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const bearer = bearerFromHeader(req.headers.authorization);
  if (!bearer) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  const idemHeader = req.headers['idempotency-key'];
  const idempotencyKey = typeof idemHeader === 'string' ? idemHeader : undefined;

  const server = new McpServer(
    { name: 'production-master-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  registerInvestigationTools(server, { bearer, idempotencyKey });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

function methodNotAllowed(res: ServerResponse): void {
  res.writeHead(405, { 'content-type': 'application/json' });
  res.end(JSON.stringify(METHOD_NOT_ALLOWED));
}

function notFound(res: ServerResponse): void {
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

/** Builds the Streamable HTTP server (`POST /mcp`) without starting it — used directly by tests. */
export function createHttpServer(): Server {
  return createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/mcp') {
      notFound(res);
      return;
    }
    if (req.method === 'POST') {
      handleMcpPost(req, res).catch((error: unknown) => {
        console.error('production-master-mcp: error handling /mcp request', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Internal server error' },
              id: null,
            }),
          );
        }
      });
      return;
    }
    methodNotAllowed(res);
  });
}

/** Starts the Streamable HTTP transport, listening on `PM_MCP_HTTP_PORT` (default 3000). */
export function startHttpServer(port: number = getHttpPort()): Server {
  const server = createHttpServer();
  server.listen(port, () => {
    console.log(`production-master-mcp: Streamable HTTP transport listening on :${port}/mcp`);
  });
  return server;
}
