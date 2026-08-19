import {
  INVESTIGATION_MCP_TOOLS,
  investigationMcpToolSchemas,
  immutableCorrectionFields,
  type InvestigationMcpToolName,
} from '@production-master/mcp-tool-contract';
import { getApiBaseUrl } from './config.js';

/**
 * Result of routing one `investigation.*` tool call. Mirrors the shape the
 * hosted service's own inbound MCP route already returns from
 * `routeInvestigationTool` (AD-23 extraction source
 * `production-master-service/serverless/edge-mcp-session/src/tool-router.ts`)
 * so this public router is a drop-in protocol equivalent, not a new design.
 */
export type ToolCallResult =
  | { ok: true; content: unknown }
  | { ok: false; status: number; error: string; message?: string; fields?: string[] };

function parseToolName(name: string): InvestigationMcpToolName | null {
  const short = name.startsWith('investigation.') ? name.slice('investigation.'.length) : name;
  return (INVESTIGATION_MCP_TOOLS as readonly string[]).includes(short)
    ? (short as InvestigationMcpToolName)
    : null;
}

/**
 * `investigationId` is not part of every tool's declared zod schema (e.g.
 * `get_evidence`, `correct_evidence`) but every REST route below still needs
 * it — the private router reads it from the raw call args rather than the
 * parsed schema output for exactly this reason, and this router matches that
 * behaviour so the two stay wire-compatible.
 */
function requireInvestigationId(args: Record<string, unknown>): string | ToolCallResult {
  const id = args.investigationId;
  if (typeof id !== 'string' || !id) {
    return { ok: false, status: 400, error: 'investigationId_required' };
  }
  return id;
}

async function apiFetch(bearer: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      // Opaque-bearer forwarding (AD-23 §5): this server never inspects or
      // verifies the token, it only relays it. The hosted service is the one
      // party that resolves identity and enforces investigation/mutate
      // scope — duplicating that check here would need `PM_JWT_SECRET`,
      // which this public, zero-secret repo must never hold.
      authorization: `Bearer ${bearer}`,
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Routes one `investigation.*` tool call to the hosted service's public
 * `/v1/*` REST + SSE surface. Performs local argument validation only —
 * no authorization decision is made here (opaque-bearer forwarding, AD-23).
 *
 * @param bearer the caller's own `mcp_session` bearer token, forwarded as-is
 * @param wireName the tool name as sent on the wire, e.g. `investigation.get_summary`
 * @param args the tool's raw call arguments
 * @param idempotencyKey optional `Idempotency-Key` to attach to mutating calls
 */
export async function routeInvestigationTool(
  bearer: string,
  wireName: string,
  args: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<ToolCallResult> {
  const short = parseToolName(wireName);
  if (!short) {
    return { ok: false, status: 400, error: 'unknown_tool' };
  }

  const parsed = investigationMcpToolSchemas[short].safeParse(args);
  if (!parsed.success) {
    return { ok: false, status: 400, error: 'invalid_arguments', message: parsed.error.message };
  }

  const invCheck = requireInvestigationId(args);
  if (typeof invCheck !== 'string') return invCheck;
  const investigationId = invCheck;

  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

  switch (short) {
    case 'get_summary': {
      const res = await apiFetch(bearer, `/v1/runs/${encodeURIComponent(investigationId)}`);
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      const run = (await res.json()) as Record<string, unknown>;
      return {
        ok: true,
        content: {
          investigationId,
          title: run.jiraTitle ?? run.id,
          status: run.status,
          mode: run.mode ?? 'deep',
          phase: run.currentPhase ?? null,
        },
      };
    }
    case 'list_evidence':
    case 'get_event_log': {
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/events?limit=200`,
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      const body = (await res.json()) as { items?: unknown[] };
      return { ok: true, content: { items: body.items ?? [] } };
    }
    case 'get_evidence': {
      const evidenceId = String((parsed.data as { evidenceId: string }).evidenceId);
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/events?limit=500`,
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      const body = (await res.json()) as { items?: Array<Record<string, unknown>> };
      const hit = (body.items ?? []).find((e) => {
        const rowId = typeof e.id === 'string' ? e.id : '';
        const data = e.data as { evidenceId?: unknown } | undefined;
        const dataId = typeof data?.evidenceId === 'string' ? data.evidenceId : '';
        return rowId === evidenceId || dataId === evidenceId;
      });
      if (!hit) return { ok: false, status: 404, error: 'NOT_FOUND' };
      return { ok: true, content: hit };
    }
    case 'list_hypotheses': {
      const res = await apiFetch(bearer, `/v1/runs/${encodeURIComponent(investigationId)}`);
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      const run = (await res.json()) as { hypotheses?: unknown[] };
      return { ok: true, content: { items: run.hypotheses ?? [] } };
    }
    case 'get_hypothesis':
      // Mirrors the hosted service's own router: there is no dedicated
      // single-hypothesis endpoint yet, only `list_hypotheses`/`get_summary`.
      // This is a known upstream gap, not something to paper over here — a
      // thin client mirrors the service, it does not invent product logic.
      return {
        ok: true,
        content: { hypothesisId: (parsed.data as { hypothesisId: string }).hypothesisId },
      };
    case 'list_actions': {
      const res = await apiFetch(
        bearer,
        `/v1/actions?runId=${encodeURIComponent(investigationId)}`,
      );
      if (!res.ok) return { ok: true, content: { items: [] } };
      return { ok: true, content: await res.json() };
    }
    case 'list_snapshots': {
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/snapshots`,
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: await res.json() };
    }
    case 'add_evidence':
    case 'add_correction':
    case 'add_comment': {
      const type =
        short === 'add_evidence'
          ? 'add_evidence'
          : short === 'add_correction'
            ? 'add_correction'
            : 'comment';
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/events`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ type, ...(parsed.data as Record<string, unknown>) }),
        },
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: await res.json() };
    }
    case 'create_snapshot': {
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/snapshots`,
        { method: 'POST', headers, body: JSON.stringify(parsed.data) },
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: await res.json() };
    }
    case 'fork': {
      const res = await apiFetch(bearer, `/v1/runs/${encodeURIComponent(investigationId)}/fork`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: await res.json() };
    }
    case 'rerun_from_phase': {
      const phaseId = (parsed.data as { phaseId: string }).phaseId;
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/rerun`,
        { method: 'POST', headers, body: JSON.stringify({ fromPhase: phaseId }) },
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: await res.json() };
    }
    case 'correct_evidence': {
      // AD-27 rule 3, defense in depth: reject a closed-patch-scope violation
      // locally before forwarding — same helper the hosted service checks,
      // so the two callers can't drift on which fields are correctable.
      const correctionArgs = parsed.data as { correction: { payloadPatch?: unknown } };
      const forbidden = immutableCorrectionFields(correctionArgs.correction.payloadPatch);
      if (forbidden.length > 0) {
        return { ok: false, status: 400, error: 'immutable_field', fields: forbidden };
      }
      const { investigationId: _inv, ...eventPayload } = parsed.data as Record<string, unknown> & {
        investigationId?: string;
      };
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/events`,
        { method: 'POST', headers, body: JSON.stringify({ type: short, ...eventPayload }) },
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return {
        ok: true,
        content: { accepted: true, updated: true, ...((await res.json()) as Record<string, unknown>) },
      };
    }
    case 'invalidate_evidence':
    case 'invalidate_hypothesis': {
      const { investigationId: _inv, ...eventPayload } = parsed.data as Record<string, unknown> & {
        investigationId?: string;
      };
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/events`,
        { method: 'POST', headers, body: JSON.stringify({ type: short, ...eventPayload }) },
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return {
        ok: true,
        content: { accepted: true, updated: true, ...((await res.json()) as Record<string, unknown>) },
      };
    }
    case 'resume': {
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/events`,
        { method: 'POST', headers, body: JSON.stringify({ type: 'resume' }) },
      );
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: { accepted: true, note: 'resume signal queued', investigationId } };
    }
    case 'get_agent_prompt': {
      // `invocationId` is `${investigationId}:${agentId}`; take the trailing
      // segment as the agent id to resolve (mirrors the hosted router).
      const invocationId = (parsed.data as { invocationId: string }).invocationId;
      const agentId = invocationId.includes(':')
        ? invocationId.slice(invocationId.lastIndexOf(':') + 1)
        : invocationId;
      const res = await apiFetch(
        bearer,
        `/v1/runs/${encodeURIComponent(investigationId)}/agent-prompt/${encodeURIComponent(agentId)}`,
      );
      if (res.status === 404) {
        return { ok: false, status: 404, error: 'NOT_FOUND', message: `no prompt for agent id "${agentId}"` };
      }
      if (!res.ok) return { ok: false, status: res.status, error: 'upstream_failed' };
      return { ok: true, content: await res.json() };
    }
    case 'subscribe': {
      return {
        ok: true,
        content: {
          streamUrl: `${getApiBaseUrl()}/v1/investigations/${encodeURIComponent(investigationId)}/stream`,
        },
      };
    }
    default:
      return { ok: false, status: 400, error: 'unknown_tool' };
  }
}
