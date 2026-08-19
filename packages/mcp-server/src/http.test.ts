import { createServer as createNodeServer, type Server as NodeServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { wireToolName } from '@production-master/mcp-tool-contract';
import { createHttpServer } from './http.js';

/**
 * Seam test for the Streamable HTTP transport. This does not call any
 * exported function directly — it starts the real `createHttpServer()` on a
 * real socket and drives it with the real MCP `Client` +
 * `StreamableHTTPClientTransport`, exactly as a hosting AI client would.
 * The only stand-in is the upstream `/v1/*` REST API, which is a real
 * `node:http` server rather than the hosted service.
 */
describe('Streamable HTTP transport (seam)', () => {
  let mcpServer: NodeServer;
  let mcpUrl: URL;
  let upstream: NodeServer;
  let upstreamRequests: Array<{ method: string; path: string; authorization?: string }>;

  beforeAll(async () => {
    upstreamRequests = [];
    upstream = createNodeServer((req, res) => {
      upstreamRequests.push({
        method: req.method ?? '',
        path: req.url ?? '',
        authorization: req.headers.authorization,
      });
      if (req.url === '/v1/runs/inv-1') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'inv-1', status: 'complete', mode: 'deep' }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    const upstreamPort = (upstream.address() as AddressInfo).port;
    process.env.PM_API_URL = `http://127.0.0.1:${upstreamPort}`;

    mcpServer = createHttpServer();
    await new Promise<void>((resolve) => mcpServer.listen(0, resolve));
    const mcpPort = (mcpServer.address() as AddressInfo).port;
    mcpUrl = new URL(`http://127.0.0.1:${mcpPort}/mcp`);
  });

  afterAll(async () => {
    await new Promise((resolve) => mcpServer.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
    delete process.env.PM_API_URL;
  });

  afterEach(() => {
    upstreamRequests = [];
  });

  it('rejects a request with no bearer before ever building a session', async () => {
    const res = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects GET and DELETE on the stateless endpoint', async () => {
    const getRes = await fetch(mcpUrl, { method: 'GET' });
    expect(getRes.status).toBe(405);
    const deleteRes = await fetch(mcpUrl, { method: 'DELETE' });
    expect(deleteRes.status).toBe(405);
  });

  it('lists all 20 investigation tools over the real wire', async () => {
    const client = new Client({ name: 'seam-test-client', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { authorization: 'Bearer test-session-jwt' } },
    });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBe(20);
      expect(tools.map((t) => t.name)).toContain(wireToolName('get_summary'));
    } finally {
      await client.close();
    }
  });

  it('calls a real tool end-to-end: MCP client -> HTTP transport -> router -> upstream REST', async () => {
    const client = new Client({ name: 'seam-test-client', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { authorization: 'Bearer test-session-jwt' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({
        name: wireToolName('get_summary'),
        arguments: { investigationId: 'inv-1' },
      });
      expect(result.isError).not.toBe(true);
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? '';
      expect(JSON.parse(text)).toMatchObject({ investigationId: 'inv-1', status: 'complete', mode: 'deep' });

      // Proves the bearer this test set on the MCP client actually reached
      // the upstream REST call unmodified — the opaque-forwarding contract
      // AD-23 requires, not just a shape match on the response.
      expect(upstreamRequests).toHaveLength(1);
      expect(upstreamRequests[0]?.authorization).toBe('Bearer test-session-jwt');
    } finally {
      await client.close();
    }
  });
});
