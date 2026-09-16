# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- **Cursor 3.11 (+2026-09-10 / desktop 3.20.17):** advance Cursor coverage through **Projects** (coordinator agent, shared context, subscriptions) and desktop CLI **3.18.9 → 3.20.17**. Feature pin remains **3.11**. Cursor-only; other platform nightlies untouched.
### Changed

- **Claude Code target bumped to 2.1.273** (from 2.1.272) in `.claude-code-version`.
  2.1.272 itself shipped no published entries ("bug fixes and reliability
  improvements"), so the real review is the 2.1.273 delta.

  **Adopted, both low-risk and directly traceable to a changelog entry (2.1.273):**

  - [Troubleshooting → Connectivity](docs/user/troubleshooting.md#connectivity)
    gained a note for 2.1.273's new disconnect notification: when Claude Code's
    automatic reconnection to an MCP server gives up, it now shows an explicit
    notice naming the server and pointing at `/mcp`, instead of a genuine outage
    only surfacing as a failed `production-master` tool call or an emptied tool
    list. This extends the existing 2.1.243/2.1.246 reconnect-reliability notes in
    the same section — nothing to change in the server itself, since it owns no
    part of the client's reconnect loop, but it's worth documenting as the
    clearest signal yet that a connection is genuinely down rather than merely
    slow.

  **Reviewed and not applicable (2.1.273):** "Improved the error shown when an
  MCP server's sign-in expires mid-session to say how to re-authenticate (`/mcp`)"
  presupposes an MCP server with its own sign-in/OAuth flow — this server's auth
  is opaque pass-through bearer with no sign-in state of its own to expire, the
  same reasoning that ruled out the 2.1.271 MCP OAuth client-registration fixes
  above. The `x-claude-code-request-class`/`-agent-type`/`-prev-tool-durations`/
  `-compaction`/`-context-compacted` gateway hint headers and the
  `OTEL_LOG_TOOL_DETAILS` real-server-name change are both about an LLM gateway or
  OTEL collector sitting in front of the *model* API — this repo has no LLM/
  model-provider SDK anywhere (AGENTS.md hard constraint 1, ip-guard-enforced) and
  no telemetry docs of its own to update. `--accept-command <sha256>` for
  `claude plugin install`/`update` and the `modelPricing` multiplier again
  presuppose a bundled plugin or a chargeback billing setup, neither of which
  this repo has (no `.claude-plugin/` manifest, consistent with the 2.1.269 note
  below). Per-command `allowed_domains` for Bash/PowerShell/Monitor sandboxing
  and `omitClaudeMd` agent frontmatter are the same non-applicable cases already
  recorded for 2.1.271 (no sandbox network policy surface in
  `.claude/settings.json`, no `.claude/agents/` here). The rest of the 2.1.273
  delta (Remote Control session forking and fast mode, `/config` mouse support,
  `--drain-marker-file`, spinner tips, the Bash-permission-checker and
  `blockReadsOutsideWorkingDirectories` fixes, prompt-cache/thinking-retention
  fixes, `.git/info/exclude` and stale-symlink-permission fixes, the
  context-meter/auto-compact accounting fix, `/tui`/scheduled-task/SDK-subagent-
  background fixes, `/install-github-app` SAML wording, the doubled-ellipsis
  spinner glitch, the frontend-design-plugin false-positive tip, the 2.1.268
  Read/Edit-deny-rule revert, and every VSCode/Windows/Claude-Code-on-the-web/
  Claude-Tag/Code-Review platform-specific item) is host-side UI, terminal,
  workflow, or platform behavior with no MCP transport, registration, or auth
  surface this server or its docs touch.

- **Claude Code target bumped to 2.1.272** (from 2.1.270) in `.claude-code-version`.
  2.1.272 itself is "bug fixes and reliability improvements" with no published
  entries, so the real review is the 2.1.271 delta.

  **Adopted, both low-risk and directly traceable to a changelog entry (2.1.271):**

  - [Troubleshooting → Transport mismatch](docs/user/troubleshooting.md#transport-mismatch)
    gained a fourth "connected but no tools" case for the tool-search fix: before
    2.1.271, Claude Code's tool search could fail to resolve one of this server's
    `investigation.*` tools when Claude called it by its short contract name instead
    of the full `mcp__production-master__investigation.*` wire name that
    `wireToolName` (`register-tools.ts`) registers. With 20 tools on this server,
    that shape is exactly what deferred tool-loading exercises, so this is a real
    symptom users of this server could hit, not a hypothetical — worth documenting
    even though there is nothing to change in the server itself (the wire names and
    resolution were always correct; only the client's search-time lookup was wrong).
  - [Troubleshooting → Connectivity](docs/user/troubleshooting.md#connectivity)'s
    existing Bedrock/Vertex/Foundry paragraph (2.1.247) got a one-sentence addendum
    for 2.1.271's `alwaysLoad` improvement on Foundry / Claude Platform on AWS
    sessions: a server marked `alwaysLoad` that finishes connecting mid-conversation
    is now usable the very next turn instead of needing an extra tool-search round
    trip. Documented as information for anyone who already sets `alwaysLoad` on
    those gateways — this repo's own Quick Start examples don't set it, so no
    config example changed.

  **Reviewed and not applicable (2.1.271), grouped by why:** the three MCP OAuth
  client-registration fixes (consent-denial re-registration, redirect-URI reuse,
  concurrent-write races) all presuppose an OAuth-based MCP server; this server's
  auth is opaque pass-through bearer, the same reason the 2.1.229/2.1.231 OAuth
  fixes didn't apply, and it has no client registration of its own to race or
  reuse. The enterprise `managed-mcp.json` parse-failure fix (an unparseable file
  now keeps exclusive MCP control and warns instead of being silently ignored) is
  self-hosted-runner behavior — this repo's CI is GitHub-hosted `ubuntu-latest`
  only (AGENTS.md hard constraint 4, `.claude/rules/constraints.md` §6); no
  self-hosted runner label appears anywhere in `.github/workflows/`, so there is no
  `managed-mcp.json` here to be malformed either way. `claude mcp serve`'s new
  30-second progress heartbeat for long-running tool calls is unrelated to this
  repo despite the name overlap: `claude mcp serve` turns Claude Code *itself*
  into an MCP server, whereas this repo ships its own standalone MCP server
  (`packages/mcp-server`, via `@modelcontextprotocol/sdk` directly, launched from
  `bin.ts`) that Claude Code connects *to* as a client — the fix doesn't touch the
  client-side long-poll behavior this server's own HTTP/stdio transports rely on.
  `omitClaudeMd` agent frontmatter presupposes custom/plugin subagents, which this
  repo doesn't define (no `.claude/agents/`, consistent with the existing
  Workflow-tool note below). Per-command `allowed_domains` for Bash/PowerShell/
  Monitor in auto mode with sandboxing has no config surface here — `.claude/
  settings.json` sets a plain `permissions.allow` list, not a sandbox network
  policy, and this server's own network egress (`PM_API_URL`) is unrelated to the
  contributor's local Bash sandbox. The rest of the 2.1.271 delta (fast mode,
  `/config` mouse support, `--drain-marker-file`, `modelPricing` multiplier,
  desktop-app spinner tips, org-policy caching/refresh fixes, Bash permission-check
  fixes for `fmt`/`column`/wildcards/variable-declaration flags,
  `blockReadsOutsideWorkingDirectories` prompt-skipping fixes, the `.git/config
  .lock` fix, macOS settings-watcher polling fallback, resumed-`-p`-session and
  LLM-gateway-`text/plain` fixes, MCP `list_changed`-loop CPU fix, Ctrl+O/`/mcp`
  Remote Control input fixes, cross-session-message delivery notices, background-
  command double-start fix, `/model`/`/reload-skills`/`/resume`/`/teleport`/
  `--resume`/`/artifacts`/background-session-watch fixes, custom-agent loading
  from a zero-inode drive, host-config-snapshot/64 MiB fix, skill-trash cleanup,
  terminal rendering/input/exit fixes, and the dynamic-workflow/Markdown-artifact/
  Artifact-tool/`/mobile` improvements) is host-side UI, terminal, workflow, or
  gateway-credential behavior with no MCP transport, registration, or auth surface
  this server or its docs touch.
