# Usage

Common workflows once the server is reachable and your MCP client is connected. For first-time setup, see [Quick Start](quick-start.md); for the endpoint and config reference, see [Commands](reference/commands.md).

## How a call flows

Every interaction is an MCP tool call:

1. Your client invokes a Production Master tool (the tools and their schemas come from `@production-master/mcp-tool-contract`).
2. `production-master-mcp` validates the call against the contract and forwards it to the hosted service, passing your `Authorization: Bearer <token>` through unchanged.
3. The hosted service runs the work and returns a result; the server relays it back to your client as the tool result.

The server keeps no state of its own and stores no credentials — it is a protocol boundary in front of the service.

## Connect from each client

The connection pattern is the same idea everywhere: register an MCP server, choose a transport, and supply a bearer token. Full snippets are in [Quick Start](quick-start.md).

- **Claude Code** — `claude mcp add` with `--transport http` (and an `Authorization` header) for the HTTP endpoint, or a plain stdio command to run the server locally.
- **Cursor** — an entry in `.cursor/mcp.json`, either a `url` (HTTP) with `headers`, or a `command` (stdio).
- **Codex** — an `[mcp_servers.production-master]` block in `.codex/config.toml` (stdio command).
- **OpenCode** — an `mcp` entry in `opencode.json` (stdio command).

Any other MCP-capable client works the same way — it only needs the `<server-url>/mcp` endpoint plus a bearer header, or a stdio command to launch the server.

## Bearer-token pass-through

Authentication is deliberately simple: **the token is yours, not the server's.**

- Your client attaches `Authorization: Bearer <token>` to each request (an HTTP header, or however your stdio client is configured to pass it).
- The server forwards that header opaquely to the hosted service and drops it — it never stores, caches, or logs the token.
- Authorization decisions are made upstream by the hosted service. A `401`/`403` in a tool result means the token is missing, expired, or lacks access — not that the server rejected you.

Because the server holds no credentials, rotating or revoking a token is entirely a matter of what your client sends next time; there is nothing to clear on the server.

**Protecting the token in sandboxed Claude Code sessions (2.1.224+).** If you keep your Production Master token in an environment variable and shell commands in your session call the endpoint directly (e.g. `curl` against `<server-url>/mcp` in a smoke test), Claude Code 2.1.224 adds sandbox credential-masking options so the raw token stays out of what the model sees: `extract` (with `onExtractNoMatch`) pulls the secret out of structured env values, and `decode: "jwt"` with `maskClaims` masks claims if your token is a JWT. These options require `network.tlsTerminate` and are honored only from user, managed, or `--settings` settings — not from project settings. This is client-side hygiene on top of the pass-through design; the server's behavior is unchanged either way.

**The `managed` marker in `/mcp` (2.1.243+) is a client-side display detail, not this server's auth.** Claude Code 2.1.243 shows a `managed` badge next to a connector in `/mcp`/`/plugins` when *that connector's* authentication is centrally managed by your organization (for example an SSO-backed claude.ai connector). This server never appears with that marker on its own: it holds no credentials and makes no authentication decision — it only forwards whatever `Authorization: Bearer <token>` header the client sends. Whether or how your organization manages the token itself is entirely a client-side/IdP concern outside this server's pass-through design.

## Which tools exist

The tool surface is defined by `@production-master/mcp-tool-contract` (published on npm) and is discovered through the standard MCP tool-listing call — your client shows the current set once connected. Tool names, inputs, and outputs are versioned by that package, so every client sees the same surface; this repo does not define or fork it.

## Typical end-to-end flow

1. Connect your client to the server (HTTP or stdio) with your bearer token.
2. List tools; your client shows the Production Master tool set.
3. Call a tool to start or follow an investigation; the server forwards it upstream.
4. Read the tool result your client renders.
5. Rotate your token by changing what the client sends — nothing to reset on the server.
