# Quick Start

Connect an MCP client to `production-master-mcp` and drive the Production Master tool set. Two ways in, matching the two transports: **HTTP** (point a client at the server endpoint) or **stdio** (run the server locally as a subprocess of your client).

> **Prerequisites:** Node.js 22, an MCP-capable client, and a Production Master token (your client sends it; the server forwards it opaquely upstream).

> **Status:** server packages are being populated via PRs. The concrete package name and endpoint land with those PRs; the connection patterns below are stable.

## Option A — connect over HTTP (`POST /mcp`)

Point your MCP client at the server's HTTP endpoint and pass your token as a bearer header. The server forwards that token to the hosted service and stores nothing.

### Claude Code

Available once the first packages land:

```
claude mcp add --transport http production-master <server-url>/mcp \
  --header "Authorization: Bearer <your-token>"
```

### Cursor

Add to `.cursor/mcp.json` in your project (or your global Cursor config), or manage
the same entry from Cursor's **Customize** page (3.9+):

```jsonc
{
  "mcpServers": {
    "production-master": {
      "url": "<server-url>/mcp",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}
```

> **Teams / Enterprise (Cursor 3.10+):** admins can configure this HTTP MCP once as a
> Team MCP and distribute it via a team marketplace (Dashboard → Integrations & MCP),
> including org-group access controls. Members then install the approved server without
> copying bearer headers by hand. Cursor pin: [`.cursor-version`](../../.cursor-version)
> (`3.11`, changelog through 2026-08-17).
>
> **Working tips:** feature pin **3.11** / **2026-08-17** (desktop CLI observed **3.16.17**). **Origin** (2026-08-17, early beta) can mirror this public GitHub repo for browse/PR in Cursor — GitHub stays the install/CI source of truth ([docs](https://cursor.com/docs/origin)). Cursor CLI **Aug 11** sticky skills (Option+Enter), steer-while-running (Enter / Enter-again), optional durable `/goal` (gated), and installed-plugin hooks execution apply when debugging this server via `agent` / desktop CLI; no MCP-side change required. Prefer **Grok 4.6** for long-running transport debugging and multi-step validation ([announcement](https://cursor.com/blog/grok-4-6)); Router Balance for routine MCP edits. **Cloud Agent Builds (2026-08-13; now default as of 2026-08-17)** warm environment install snapshots — confirm a successful Build + team/env secrets so MCP/server validation boots faster; put durable deps in `install`, fresh services in `start`; use **team/environment secrets** for private-registry install credentials; Skipped recurring Builds are healthy; **Staleness threshold** defaults to **24h** (`0` = always pull); phases: `install` / `start` / `terminals`. Optional desktop `workspaceOpen` hook can return `pluginPaths`. Cursor loads [Agent Plugins](https://agent-plugins.org) alongside Cursor Plugins. Use a side chat (`/side` / `/btw`, 3.11) to debug transport shape
> or bearer headers without interrupting the main session. Cursor Automations (3.8,
> `/automate`) can **delete memory files** from the UI (or when prompted) and can triage **Workflow run completed** failures (including `ip-guard`)
> and open a fix PR; computer use is available when you want a demo artifact.
> **Inbox multi-PR sessions (2026-07-29):** when one chat opens several related PRs,
> open every PR from the session — not only the last.

### Any MCP client

Give it the endpoint `<server-url>/mcp` and an `Authorization: Bearer <token>` header. That is the whole contract.

## Option B — run over stdio (local)

Run the server as a local subprocess of your client instead of hosting it.

### Claude Code

Available once the first packages land:

```
claude mcp add production-master -- npx -y @production-master/mcp
```

### Codex

Add to `.codex/config.toml`:

```toml
[mcp_servers.production-master]
command = "npx"
args = ["-y", "@production-master/mcp"]
```

### OpenCode

Add to `opencode.json`:

```jsonc
{
  "mcp": {
    "production-master": {
      "command": ["npx", "-y", "@production-master/mcp"]
    }
  }
}
```

Reload your client so it picks up the new server.

## Verify the connection

Once connected, your client should list the Production Master tools (their schemas come from `@production-master/mcp-tool-contract`). Call one that starts or lists investigations; the server relays it to the hosted service under your bearer token and returns the result. If a call comes back `401`, your token is missing or expired — see [Troubleshooting → Auth](troubleshooting.md#auth-failures).

## Next steps

- [Usage](usage.md) — connecting from each client and the bearer pass-through in depth
- [Commands](reference/commands.md) — the endpoint shape, transports, and config
- [Troubleshooting](troubleshooting.md) — if a connection or auth attempt fails
