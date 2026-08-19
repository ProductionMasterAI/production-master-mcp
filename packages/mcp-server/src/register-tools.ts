import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  INVESTIGATION_MCP_TOOLS,
  investigationMcpToolSchemas,
  wireToolName,
} from '@production-master/mcp-tool-contract';
import { routeInvestigationTool } from '@production-master/mcp-tool-router';

export interface ToolCallContext {
  /** The caller's own `mcp_session` bearer, forwarded opaquely (AD-23). */
  bearer: string;
  /** Attached to mutating calls as `Idempotency-Key`, when the caller supplied one. */
  idempotencyKey?: string;
}

function toolErrorResult(payload: Record<string, unknown>): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

/**
 * Registers all 20 `investigation.*` tools from the shared contract package
 * onto `server`, each one delegating to {@link routeInvestigationTool}. One
 * definition shared by both transports (HTTP and stdio) — see `http.ts` /
 * `stdio.ts` — so the tool surface can never drift between them.
 */
export function registerInvestigationTools(server: McpServer, context: ToolCallContext): void {
  for (const shortName of INVESTIGATION_MCP_TOOLS) {
    const name = wireToolName(shortName);
    const schema = investigationMcpToolSchemas[shortName];
    server.registerTool(
      name,
      {
        description: `Production Master investigation tool: ${shortName}`,
        inputSchema: schema,
      },
      async (args): Promise<CallToolResult> => {
        const result = await routeInvestigationTool(
          context.bearer,
          name,
          (args ?? {}) as Record<string, unknown>,
          context.idempotencyKey,
        );
        if (!result.ok) {
          return toolErrorResult({
            error: result.error,
            status: result.status,
            ...(result.message ? { message: result.message } : {}),
            ...(result.fields ? { fields: result.fields } : {}),
          });
        }
        return { content: [{ type: 'text', text: JSON.stringify(result.content) }] };
      },
    );
  }
}
