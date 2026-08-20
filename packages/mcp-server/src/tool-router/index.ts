import {
  INVESTIGATION_MCP_TOOLS,
  investigationMcpToolSchemas,
  immutableCorrectionFields,
  type InvestigationMcpToolName,
} from '@production-master/mcp-tool-contract';
import { getApiBaseUrl } from './config.js';
import { requestUpstream, scrubToken, type UpstreamFailure } from './upstream.js';

export {
  requestUpstream,
  scrubToken,
  type UpstreamErrorCode,
  type UpstreamFailure,
  type UpstreamResult,
} from './upstream.js';

/**
 * Result of routing one `investigation.*` tool call.
 *
 * This is a wire-compatible shape, not a new design: the hosted Production
 * Master service accepts MCP tool calls directly on its own endpoint and
 * answers with this same discriminated union, so a client can switch between
 * talking to the service directly and talking to it through this relay
 * without changing how it reads a result. Treat the union as the contract —
 * `ok: true` carries `content`; `ok: false` always carries a numeric `status`
 * and a machine-readable `error`, never an empty success. Changing either arm
 * is a breaking change for both paths.
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

/** An {@link UpstreamFailure} is already the failure half of {@link ToolCallResult}. */
function relayFailure(failure: UpstreamFailure): ToolCallResult {
  return failure;
}

/**
 * Routes one `investigation.*` tool call to the hosted service's public
 * `/v1/*` REST + SSE surface. Performs local argument validation only —
 * no authorization decision is made here (opaque-bearer forwarding, AD-23).
 *
 * Every upstream failure — a non-2xx, an unreachable host, a non-JSON body —
 * comes back as a distinct `ok: false` code. None of them is ever reported as
 * an empty success: a caller must always be able to tell "there is nothing
 * here" from "the relay could not find out".
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
    return {
      ok: false,
      status: 400,
      error: 'invalid_arguments',
      // Scrubbed like every other outbound string: a caller can put anything
      // in an argument, including a token, and zod quotes the offending value.
      message: scrubToken(parsed.error.message, bearer),
    };
  }

  const invCheck = requireInvestigationId(args);
  if (typeof invCheck !== 'string') return invCheck;
  const investigationId = invCheck;
  const runPath = `/v1/runs/${encodeURIComponent(investigationId)}`;

  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

  /** POST an event to the run's event log — the shared shape behind eight tools. */
  const postEvent = (body: Record<string, unknown>) =>
    requestUpstream<Record<string, unknown>>(bearer, `${runPath}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

  switch (short) {
    case 'get_summary': {
      const res = await requestUpstream<Record<string, unknown>>(bearer, runPath);
      if (!res.ok) return relayFailure(res);
      const run = res.data;
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
      const res = await requestUpstream<{ items?: unknown[] }>(
        bearer,
        `${runPath}/events?limit=200`,
      );
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: { items: res.data.items ?? [] } };
    }
    case 'get_evidence': {
      const evidenceId = String((parsed.data as { evidenceId: string }).evidenceId);
      const res = await requestUpstream<{ items?: Array<Record<string, unknown>> }>(
        bearer,
        `${runPath}/events?limit=500`,
      );
      if (!res.ok) return relayFailure(res);
      const hit = (res.data.items ?? []).find((e) => {
        const rowId = typeof e.id === 'string' ? e.id : '';
        const data = e.data as { evidenceId?: unknown } | undefined;
        const dataId = typeof data?.evidenceId === 'string' ? data.evidenceId : '';
        return rowId === evidenceId || dataId === evidenceId;
      });
      // A genuine "not in this log" — distinct from `upstream_not_found`,
      // which would mean the relay never got a log to search.
      if (!hit) return { ok: false, status: 404, error: 'NOT_FOUND' };
      return { ok: true, content: hit };
    }
    case 'list_hypotheses': {
      const res = await requestUpstream<{ hypotheses?: unknown[] }>(bearer, runPath);
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: { items: res.data.hypotheses ?? [] } };
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
      const res = await requestUpstream(
        bearer,
        `/v1/actions?runId=${encodeURIComponent(investigationId)}`,
      );
      // Previously a non-2xx here returned `{ ok: true, items: [] }`, which
      // made a broken or unauthorised upstream indistinguishable from an
      // investigation that genuinely has no actions. Surface the failure.
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: res.data };
    }
    case 'list_snapshots': {
      const res = await requestUpstream(bearer, `${runPath}/snapshots`);
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: res.data };
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
      const res = await postEvent({ type, ...(parsed.data as Record<string, unknown>) });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: res.data };
    }
    case 'create_snapshot': {
      const res = await requestUpstream(bearer, `${runPath}/snapshots`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: res.data };
    }
    case 'fork': {
      const res = await requestUpstream(bearer, `${runPath}/fork`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: res.data };
    }
    case 'rerun_from_phase': {
      const phaseId = (parsed.data as { phaseId: string }).phaseId;
      const res = await requestUpstream(bearer, `${runPath}/rerun`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromPhase: phaseId }),
      });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: res.data };
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
      const res = await postEvent({ type: short, ...eventPayload });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: { accepted: true, updated: true, ...res.data } };
    }
    case 'invalidate_evidence':
    case 'invalidate_hypothesis': {
      const { investigationId: _inv, ...eventPayload } = parsed.data as Record<string, unknown> & {
        investigationId?: string;
      };
      const res = await postEvent({ type: short, ...eventPayload });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: { accepted: true, updated: true, ...res.data } };
    }
    case 'resume': {
      const res = await postEvent({ type: 'resume' });
      if (!res.ok) return relayFailure(res);
      return { ok: true, content: { accepted: true, note: 'resume signal queued', investigationId } };
    }
    case 'get_agent_prompt': {
      // `invocationId` is `${investigationId}:${agentId}`; take the trailing
      // segment as the agent id to resolve (mirrors the hosted router).
      const invocationId = (parsed.data as { invocationId: string }).invocationId;
      const agentId = invocationId.includes(':')
        ? invocationId.slice(invocationId.lastIndexOf(':') + 1)
        : invocationId;
      const res = await requestUpstream(
        bearer,
        `${runPath}/agent-prompt/${encodeURIComponent(agentId)}`,
      );
      if (!res.ok) {
        if (res.status === 404) {
          return {
            ok: false,
            status: 404,
            error: 'NOT_FOUND',
            message: `no prompt for agent id "${agentId}"`,
          };
        }
        return relayFailure(res);
      }
      return { ok: true, content: res.data };
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
