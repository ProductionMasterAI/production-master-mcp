# Quick Start

Connect an MCP client to `production-master-mcp` and drive the Production Master tool set. Two ways in, matching the two transports: **HTTP** (point a client at the server endpoint) or **stdio** (run the server locally as a subprocess of your client).

> **Prerequisites:** Node.js 22, an MCP-capable client, and a Production Master token (your client sends it; the server forwards it opaquely upstream).

> **Status:** the server package (`@production-master/mcp`, launched as `production-master-mcp`) is implemented but not yet published to npm, and no hosted HTTP endpoint is deployed yet — so `npx -y @production-master/mcp` and `<server-url>` below are not runnable today. The package name, CLI name, and connection patterns are final.

## Option A — connect over HTTP (`POST /mcp`)

Point your MCP client at the server's HTTP endpoint and pass your token as a bearer header. The server forwards that token to the hosted service and stores nothing.

### Claude Code

```
claude mcp add --transport http production-master <server-url>/mcp \
  --header "Authorization: Bearer <your-token>"
```

> **Avoiding a long-lived token in your config:** `--header` above stores the raw bearer
> in your MCP client config. Claude Code's `headersHelper` mints the `Authorization`
> header at connect time instead by running a command you supply — useful if you'd
> rather mint a short-lived Production Master token than paste a static one. Since
> Claude Code 2.1.238, a `headersHelper` configured in a project `.mcp.json` requires
> that project's trust dialog to have been accepted first (including under `claude -p`),
> and it runs without your shell's inherited credential env vars — user-, managed-, and
> claude.ai-scope helpers run from the Claude config dir instead. Before Claude Code
> 2.1.248, a `headersHelper`-minted `Authorization` header that drew a `401` from this
> server (for example because the minted token had expired) could send the client into
> OAuth discovery instead of simply re-running your helper for a fresh token — a flow
> this server, being pass-through-bearer only, never supports. On 2.1.248+ a `401`
> re-runs the helper and retries the call, as documented. See Claude Code's MCP docs
> for `headersHelper` syntax.

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
> (`3.11`, changelog through 2026-08-27).
>
> **Working tips:** feature pin **3.11** / **2026-08-27** (desktop CLI observed **3.18.9**). **2026-08-27:** Cloud Agents can **Start from scratch** without a connected SCM, save via Origin **Create repo**, use **browser port-forward preview**, and optionally **Vercel publish**. **2026-08-19:** Cloud Agents gain **Subscriptions** (auto-subscribe to PRs they open), **Custom Modes** (⌥⏎ skill→mode), **subagents on isolated VMs**, Agent Window **`/goal`** (native **CreateGoal** / **UpdateGoal**), and **non-interruptive steering**. **Origin** (2026-08-17, early beta) can mirror this public GitHub repo for browse/PR in Cursor; use the [Origin CLI](https://cursor.com/docs/origin/cli) for clone/push/pull; agents can [create Origin repos](https://cursor.com/docs/origin/create-repository); connect [Automations / Cloud Agents](https://cursor.com/docs/origin/integrations) and apps (Vercel / Depot / Buildkite) from repo settings. GitHub stays the install/CI source of truth ([docs](https://cursor.com/docs/origin)). Cursor CLI **Aug 11** sticky skills (Option+Enter), steer-while-running (Enter / Enter-again), optional durable `/goal` (gated), and installed-plugin hooks execution apply when debugging this server via `agent` / desktop CLI; no MCP-side change required. Prefer **Grok 4.6** for long-running transport debugging and multi-step validation ([announcement](https://cursor.com/blog/grok-4-6)); Router Balance for routine MCP edits. **Cloud Agent Builds (2026-08-13; now default as of 2026-08-17)** warm environment install snapshots — confirm a successful Build + team/env secrets so MCP/server validation boots faster; put durable deps in `install`, fresh services in `start`; use **team/environment secrets** for private-registry install credentials; Skipped recurring Builds are healthy; **Staleness threshold** defaults to **24h** (`0` = always pull); phases: `install` / `start` / `terminals`. Optional desktop `workspaceOpen` hook can return `pluginPaths`. Cursor loads [Agent Plugins](https://agent-plugins.org) alongside Cursor Plugins. Use a side chat (`/side` / `/btw`, 3.11) to debug transport shape
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

```
claude mcp add production-master --env PM_SESSION_JWT=<your-token> -- npx -y @production-master/mcp
```

### Codex

Add to `.codex/config.toml`:

```toml
[mcp_servers.production-master]
command = "npx"
args = ["-y", "@production-master/mcp"]
env = { PM_SESSION_JWT = "<your-token>" }
```

### OpenCode

Add to `opencode.json`:

```jsonc
{
  "mcp": {
    "production-master": {
      "command": ["npx", "-y", "@production-master/mcp"],
      "environment": { "PM_SESSION_JWT": "<your-token>" }
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
