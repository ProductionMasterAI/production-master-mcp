import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerInvestigationTools } from './register-tools.js';
import { getStdioSessionBearer } from './config.js';

/**
 * Starts the stdio transport for local MCP hosts (Claude Desktop, Cursor,
 * VS Code, `npx production-master-mcp`). One long-lived server for the
 * process's whole run — the bearer is fixed at startup (`PM_SESSION_JWT`),
 * unlike the HTTP transport where each request carries its own.
 */
export async function startStdioServer(): Promise<McpServer> {
  const bearer = getStdioSessionBearer();
  const server = new McpServer(
    { name: 'production-master-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  registerInvestigationTools(server, { bearer });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
