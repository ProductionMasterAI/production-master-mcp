import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routeInvestigationTool } from './index.js';

/**
 * Seam test, not a mock-your-own-shape test: a real Node HTTP server stands
 * in for the hosted `/v1/*` REST surface and the router talks to it over a
 * real socket via real `fetch`. This proves what the router actually puts on
 * the wire (method, path, the forwarded `Authorization` header, JSON body) —
 * not what a hand-rolled `fetch` mock was told to expect.
 */
describe('routeInvestigationTool (seam: real HTTP against a stand-in /v1/* server)', () => {
  let server: Server;
  let baseUrl: string;
  let received: {
    method: string;
    url: string;
    authorization: string | undefined;
    idempotencyKey: string | undefined;
    body: unknown;
  }[];
  let previousApiUrl: string | undefined;

  beforeEach(async () => {
    received = [];
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        received.push({
          method: req.method ?? '',
          url: req.url ?? '',
          authorization: req.headers.authorization,
          idempotencyKey: req.headers['idempotency-key'] as string | undefined,
          body: rawBody ? JSON.parse(rawBody) : undefined,
        });

        if (req.url?.startsWith('/v1/runs/inv-1/events') && req.method === 'GET') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              items: [{ id: 'ev-1', data: { evidenceId: 'ev-1' } }],
            }),
          );
          return;
        }
        if (req.url === '/v1/runs/inv-1' && req.method === 'GET') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ id: 'inv-1', status: 'running', jiraTitle: 'Payments 500s' }));
          return;
        }
        if (req.url === '/v1/runs/inv-1/events' && req.method === 'POST') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ id: 'evt-99', accepted: true }));
          return;
        }
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found_in_stub' }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    previousApiUrl = process.env.PM_API_URL;
    process.env.PM_API_URL = baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousApiUrl === undefined) delete process.env.PM_API_URL;
    else process.env.PM_API_URL = previousApiUrl;
  });

  it('get_summary: real request hits GET /v1/runs/:id with the bearer forwarded, unmodified', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.get_summary', {
      investigationId: 'inv-1',
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      method: 'GET',
      url: '/v1/runs/inv-1',
      authorization: 'Bearer user-token-abc',
    });
    expect(result).toEqual({
      ok: true,
      content: { investigationId: 'inv-1', title: 'Payments 500s', status: 'running', mode: 'deep', phase: null },
    });
  });

  it('add_evidence: POSTs the event and passes through the idempotency key', async () => {
    const result = await routeInvestigationTool(
      'user-token-abc',
      'investigation.add_evidence',
      { investigationId: 'inv-1', evidence: { type: 'user_provided', title: 't', body: 'b' } },
      'idem-key-1',
    );
    expect(received[0]).toMatchObject({
      method: 'POST',
      url: '/v1/runs/inv-1/events',
      idempotencyKey: 'idem-key-1',
    });
    expect(result).toMatchObject({ ok: true });
  });

  it('correct_evidence: rejects an out-of-scope field WITHOUT calling upstream at all (AD-27 rule 3)', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.correct_evidence', {
      investigationId: 'inv-1',
      evidenceId: 'ev-1',
      correction: { rationale: 'typo', payloadPatch: { pointer: 'evil' } },
    });
    expect(received).toHaveLength(0);
    expect(result).toEqual({ ok: false, status: 400, error: 'immutable_field', fields: ['pointer'] });
  });

  it('rejects an unknown tool name without making any request', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.delete_everything', {});
    expect(received).toHaveLength(0);
    expect(result).toEqual({ ok: false, status: 400, error: 'unknown_tool' });
  });

  it('rejects arguments that fail the shared contract schema', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.get_summary', {
      investigationId: '',
    });
    expect(received).toHaveLength(0);
    expect(result).toMatchObject({ ok: false, status: 400, error: 'invalid_arguments' });
  });

  it('requires investigationId even for tools whose declared schema omits it', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.get_evidence', {
      evidenceId: 'ev-1',
    });
    expect(received).toHaveLength(0);
    expect(result).toEqual({ ok: false, status: 400, error: 'investigationId_required' });
  });

  it('get_evidence: finds the event by id in the log and returns 404 when absent', async () => {
    const found = await routeInvestigationTool('user-token-abc', 'investigation.get_evidence', {
      investigationId: 'inv-1',
      evidenceId: 'ev-1',
    });
    expect(found).toEqual({ ok: true, content: { id: 'ev-1', data: { evidenceId: 'ev-1' } } });

    const missing = await routeInvestigationTool('user-token-abc', 'investigation.get_evidence', {
      investigationId: 'inv-1',
      evidenceId: 'nope',
    });
    expect(missing).toEqual({ ok: false, status: 404, error: 'NOT_FOUND' });
  });

  it('subscribe: builds the public stream URL without calling upstream', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.subscribe', {
      investigationId: 'inv-1',
    });
    expect(received).toHaveLength(0);
    expect(result).toEqual({
      ok: true,
      content: { streamUrl: `${baseUrl}/v1/investigations/inv-1/stream` },
    });
  });

  it('surfaces a non-2xx upstream response as upstream_failed, not a silent empty success', async () => {
    const result = await routeInvestigationTool('user-token-abc', 'investigation.get_summary', {
      investigationId: 'inv-does-not-exist',
    });
    expect(result).toMatchObject({ ok: false, error: 'upstream_failed' });
  });
});
