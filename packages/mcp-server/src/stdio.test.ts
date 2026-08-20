import { createServer as createNodeServer, type Server as NodeServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { wireToolName } from '@production-master/mcp-tool-contract';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = path.resolve(packageRoot, '..', '..');
const binPath = path.join(packageRoot, 'dist', 'bin.js');

/**
 * Seam test for the stdio transport. Builds the real package (so `dist/bin.js`
 * matches what `npx production-master-mcp` actually ships) and spawns it as a
 * real child process via the real `StdioClientTransport`+`Client` — the same
 * wire a local MCP host (Claude Desktop, Cursor) speaks. Only the upstream
 * `/v1/*` REST API is a stand-in.
 */
describe('stdio transport (seam)', () => {
  let upstream: NodeServer;
  let upstreamRequests: Array<{ path: string; authorization?: string }>;
  let upstreamPort: number;

  beforeAll(() => {
    execFileSync('npm', ['run', 'build', '--workspace=@production-master/mcp'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  }, 60_000);

  beforeAll(async () => {
    upstreamRequests = [];
    upstream = createNodeServer((req, res) => {
      upstreamRequests.push({ path: req.url ?? '', authorization: req.headers.authorization });
      if (req.url === '/v1/runs/inv-1') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'inv-1', status: 'complete', mode: 'deep' }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    });
    await new Promise<void>((resolve) => upstream.listen(0, resolve));
    upstreamPort = (upstream.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise((resolve) => upstream.close(resolve));
  });

  afterEach(() => {
    upstreamRequests = [];
  });

  it('lists all 20 investigation tools over a real spawned stdio process', async () => {
    const client = new Client({ name: 'seam-test-client', version: '0.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [binPath],
      env: {
        PM_SESSION_JWT: 'test-session-jwt',
        PM_API_URL: `http://127.0.0.1:${upstreamPort}`,
      },
    });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBe(20);
      expect(tools.map((t) => t.name)).toContain(wireToolName('get_summary'));
    } finally {
      await client.close();
    }
  }, 30_000);

  it('calls a real tool end-to-end: MCP client -> stdio transport -> router -> upstream REST', async () => {
    const client = new Client({ name: 'seam-test-client', version: '0.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [binPath],
      env: {
        PM_SESSION_JWT: 'test-session-jwt',
        PM_API_URL: `http://127.0.0.1:${upstreamPort}`,
      },
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
      expect(upstreamRequests).toHaveLength(1);
      expect(upstreamRequests[0]?.authorization).toBe('Bearer test-session-jwt');
    } finally {
      await client.close();
    }
  }, 30_000);

  it('refuses to start without PM_SESSION_JWT (no silent empty-bearer fallback)', async () => {
    const client = new Client({ name: 'seam-test-client', version: '0.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [binPath],
      env: { PM_API_URL: `http://127.0.0.1:${upstreamPort}` },
      stderr: 'pipe',
    });
    await expect(client.connect(transport)).rejects.toBeTruthy();
  }, 30_000);
});
