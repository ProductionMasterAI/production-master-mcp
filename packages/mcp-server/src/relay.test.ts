import { createServer as createNodeServer, type Server as NodeServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { wireToolName } from '@production-master/mcp-tool-contract';
import { createHttpServer } from './http.js';

/**
 * Seam test for the upstream relay: a real MCP `Client` drives the real HTTP
 * transport, which drives the real router, which makes real `fetch` calls to
 * a stand-in for the hosted `/v1/*` API. Nothing between the client and the
 * upstream socket is mocked, so these assertions are about what the relay
 * actually does rather than what a mock was told to say.
 *
 * The three properties under test are the ones the pass-through-auth design
 * turns on, and none of them is visible from either side alone:
 *   1. the caller's credential really reaches upstream, unmodified;
 *   2. it appears in no log line and in no value returned to the caller —
 *      including when the upstream itself echoes it back;
 *   3. an upstream failure is distinguishable from a legitimate empty result.
 */

/** Distinctive so a substring search for it cannot match anything incidental. */
const CALLER_TOKEN = 'pm-session-token-8f3a2c1d-do-not-leak';

interface UpstreamCall {
  method: string;
  path: string;
  authorization?: string;
  idempotencyKey?: string;
}

describe('upstream relay (seam: real MCP client -> transport -> router -> stand-in upstream)', () => {
  let mcpServer: NodeServer;
  let mcpUrl: URL;
  let upstream: NodeServer | undefined;
  let upstreamCalls: UpstreamCall[];
  let respond: (req: { url: string; method: string }) => { status: number; body: string };
  let consoleOutput: string[];

  beforeEach(async () => {
    upstreamCalls = [];
    respond = () => ({ status: 200, body: '{}' });

    upstream = createNodeServer((req, res) => {
      upstreamCalls.push({
        method: req.method ?? '',
        path: req.url ?? '',
        authorization: req.headers.authorization,
        idempotencyKey: req.headers['idempotency-key'] as string | undefined,
      });
      req.resume();
      req.on('end', () => {
        const { status, body } = respond({ url: req.url ?? '', method: req.method ?? '' });
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(body);
      });
    });
    await new Promise<void>((resolve) => upstream!.listen(0, resolve));
    process.env.PM_API_URL = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;

    mcpServer = createHttpServer();
    await new Promise<void>((resolve) => mcpServer.listen(0, resolve));
    mcpUrl = new URL(`http://127.0.0.1:${(mcpServer.address() as AddressInfo).port}/mcp`);

    // Capture every console channel the server could write to, so the
    // no-leak assertion covers real log output rather than a chosen call site.
    consoleOutput = [];
    const capture =
      () =>
      (...args: unknown[]) => {
        consoleOutput.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
      };
    vi.spyOn(console, 'log').mockImplementation(capture());
    vi.spyOn(console, 'error').mockImplementation(capture());
    vi.spyOn(console, 'warn').mockImplementation(capture());
    vi.spyOn(console, 'info').mockImplementation(capture());
    vi.spyOn(console, 'debug').mockImplementation(capture());
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise((resolve) => mcpServer.close(resolve));
    if (upstream?.listening) await new Promise((resolve) => upstream!.close(resolve));
    upstream = undefined;
    delete process.env.PM_API_URL;
  });

  async function callTool(name: string, args: Record<string, unknown>) {
    const client = new Client({ name: 'relay-seam-test', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(mcpUrl, {
      requestInit: { headers: { authorization: `Bearer ${CALLER_TOKEN}` } },
    });
    await client.connect(transport);
    try {
      return await client.callTool({ name: wireToolName(name), arguments: args });
    } finally {
      await client.close();
    }
  }

  function resultText(result: Awaited<ReturnType<typeof callTool>>): string {
    return (result.content as Array<{ type: string; text?: string }>)
      .map((c) => c.text ?? '')
      .join('');
  }

  it("forwards the caller's own credential upstream, unmodified, including on a mutating call", async () => {
    respond = () => ({ status: 200, body: JSON.stringify({ id: 'evt-1', accepted: true }) });

    const result = await callTool('add_evidence', {
      investigationId: 'inv-1',
      evidence: { type: 'user_provided', title: 't', body: 'b' },
    });

    expect(result.isError).not.toBe(true);
    expect(upstreamCalls).toHaveLength(1);
    // The exact token the MCP client presented, not a re-minted or re-wrapped
    // one: the relay holds no credential of its own to substitute.
    expect(upstreamCalls[0]?.authorization).toBe(`Bearer ${CALLER_TOKEN}`);
    expect(upstreamCalls[0]).toMatchObject({ method: 'POST', path: '/v1/runs/inv-1/events' });
  });

  it('never leaks the credential into a log line or a tool result, even when the upstream echoes it back', async () => {
    // A hostile or merely careless upstream reflecting the Authorization
    // header into its error body is the realistic leak path: the relay reads
    // that body to stay diagnosable, so the body is attacker-influenced text
    // heading straight for a client transcript.
    respond = () => ({
      status: 500,
      body: JSON.stringify({
        error: 'internal',
        echoed: `Bearer ${CALLER_TOKEN}`,
        detail: `token ${CALLER_TOKEN} rejected`,
      }),
    });

    const result = await callTool('get_summary', { investigationId: 'inv-1' });

    expect(result.isError).toBe(true);
    const text = resultText(result);
    // The upstream detail still reaches the caller — this is not a blanket
    // suppression that would make the failure undiagnosable...
    expect(text).toContain('internal');
    expect(text).toContain('[redacted]');
    // ...but the credential itself does not.
    expect(text).not.toContain(CALLER_TOKEN);
    expect(consoleOutput.join('\n')).not.toContain(CALLER_TOKEN);
  });

  it('surfaces an upstream 500 as a distinguishable error, not an empty success', async () => {
    respond = () => ({ status: 500, body: JSON.stringify({ error: 'boom' }) });

    const result = await callTool('list_evidence', { investigationId: 'inv-1' });

    expect(result.isError).toBe(true);
    const payload = JSON.parse(resultText(result)) as { error: string; status: number };
    expect(payload).toMatchObject({ error: 'upstream_failed', status: 500 });
    // The failure must not be confusable with the legitimately-empty answer.
    expect(resultText(result)).not.toContain('"items":[]');
  });

  it('distinguishes an unauthorized upstream from a server error', async () => {
    respond = () => ({ status: 401, body: JSON.stringify({ error: 'invalid_token' }) });

    const result = await callTool('get_summary', { investigationId: 'inv-1' });

    expect(result.isError).toBe(true);
    expect(JSON.parse(resultText(result))).toMatchObject({
      error: 'upstream_unauthorized',
      status: 401,
    });
  });

  it('list_actions reports an upstream failure instead of an empty action list', async () => {
    // Regression guard: this path used to `return { ok: true, items: [] }` on
    // any non-2xx, making a broken upstream identical to an investigation
    // that genuinely has no actions.
    respond = () => ({ status: 503, body: JSON.stringify({ error: 'unavailable' }) });

    const result = await callTool('list_actions', { investigationId: 'inv-1' });

    expect(result.isError).toBe(true);
    expect(JSON.parse(resultText(result))).toMatchObject({ status: 503 });
    expect(resultText(result)).not.toContain('"items":[]');
  });

  it('reports an unreachable upstream rather than an empty or hanging result', async () => {
    await new Promise((resolve) => upstream!.close(resolve));

    const result = await callTool('get_summary', { investigationId: 'inv-1' });

    expect(result.isError).toBe(true);
    const payload = JSON.parse(resultText(result)) as { error: string; status: number };
    expect(payload).toMatchObject({ error: 'upstream_unreachable', status: 502 });
    expect(consoleOutput.join('\n')).not.toContain(CALLER_TOKEN);
  });

  it('accepts a legitimate 204 as an empty success rather than a broken response', async () => {
    // The mirror image of the silent-empty defect: a genuinely empty answer
    // must not be raised as a false alarm. 204 is the one case where
    // "nothing came back" is the honest result.
    respond = () => ({ status: 204, body: '' });

    const result = await callTool('add_comment', {
      investigationId: 'inv-1',
      body: 'looks right',
    });

    expect(result.isError).not.toBe(true);
    expect(upstreamCalls[0]?.authorization).toBe(`Bearer ${CALLER_TOKEN}`);
  });

  it('reports a non-JSON 200 from the upstream as a broken response, not an empty one', async () => {
    respond = () => ({ status: 200, body: '<html>gateway</html>' });

    const result = await callTool('get_summary', { investigationId: 'inv-1' });

    expect(result.isError).toBe(true);
    expect(JSON.parse(resultText(result))).toMatchObject({ error: 'upstream_invalid_response' });
  });
});
