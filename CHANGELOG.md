# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`.codex-version` — tracked Codex target release (0.147.0).** New root marker
  recording the latest Codex release this server targets, mirroring
  `.claude-code-version`, so supported-client updates are diffable and automatable.
  Compatibility scope: nothing in the 0.147.0 delta changes the documented
  `.codex/config.toml` stdio registration or the pass-through-auth design. Its one
  protocol-facing item — an **opt-in** MCP 2026-07-28 protocol — is opt-in on the
  host side and is noted here as a future consideration, not adopted: `packages/`
  is still empty, so there is no server implementation to negotiate it. This is a
  review of the release notes, not an end-to-end host test.

### Changed
- **Cursor target pinned to 3.11** (changelog covered through **2026-08-03**) via
  new root [`.cursor-version`](.cursor-version). The 3.11 delta was reviewed against
  the documented `.cursor/mcp.json` HTTP registration and the pass-through-auth
  design and needs no server-side change. The README badge row tracks *validation*,
  so Cursor's badge stays `pending` — nothing here is an end-to-end host test, and
  no platform has cleared that axis. Quick Start documents Customize-page MCP
  management (3.9+) and Team MCP / team-marketplace distribution with org-group
  access (3.10+) for the HTTP transport.
- **Cursor working tips** — side chats (3.11) for transport/auth debugging; Automations
  (3.8) for CI / `ip-guard` triage with optional computer-use demos; Inbox
  **multi-PR sessions** (2026-07-29).
- **Claude Code target bumped to 2.1.232** (from 2.1.231) in `.claude-code-version`.
  The 2.1.232 delta needs no server-side change, but one client-side fix is worth
  a troubleshooting note, now added: before 2.1.232, an MCP server that failed to
  answer — or answered with a malformed reply to — Claude Code's protocol-version
  probe left the client hanging for the full 30-second connect timeout before
  reporting failure; on 2.1.232+ the failure surfaces immediately with error text
  in `claude mcp list`. Documented in `docs/user/troubleshooting.md` (Connectivity)
  so a "registration hangs ~30s then fails" symptom is read as a client-version
  answer, not a server bug. Rest of the delta reviewed and not applicable: the
  GitLab token-redaction families and `glab` credential protections concern the
  host's own shell/credential hygiene, not the pass-through bearer design (this
  server's tokens are never GitLab-shaped and never logged either way); GitLab
  plugin-marketplace sources, marketplace settings aliases
  (`additionalMarketplaces`/`allowedMarketplaces`), and the
  `/plugin install plugin@marketplace` refresh concern plugin distribution, which
  this server does not use (it registers via `claude mcp add`, `.cursor/mcp.json`,
  or `.codex/config.toml`); and the session-naming/`@`-mention, subagent-forking,
  Remote Control, gateway-overlay, and sandbox `ripgrep`-override changes are all
  host-side with no MCP transport, registration, or auth surface.
- **Claude Code target bumped to 2.1.231** (from 2.1.228) in `.claude-code-version`.
  The 2.1.229 + 2.1.231 delta (no 2.1.230 entry was published) needs no server-side
  change — the entries closest to this server's domain are the two MCP OAuth fixes
  (2.1.229 uses `127.0.0.1` instead of `localhost` in redirect URIs for strict
  authorization servers; 2.1.231 fixes a redirect-URI mismatch for servers with
  pre-registered OAuth clients, such as Slack), and both concern OAuth-flow MCP
  servers on the client side. This server deliberately has no OAuth surface: auth
  is a pass-through bearer header, exactly as quick-start documents, so nothing
  here changes and the fixes simply make Claude Code a better-behaved client for
  *other* servers registered alongside this one. Also reviewed: 2.1.229's SSE
  keepalive pings apply to Claude Code's own model-gateway streaming (Vertex and
  Bedrock upstreams), not to MCP Streamable HTTP transports, and the
  self-hosted-runner `managed-mcp.json` fix (server-delivered MCP servers are now
  skipped with a warning instead of exiting at startup) is host-side runner
  behavior. The rest of the delta (terminal rendering and crash fixes, plugin
  marketplace `command` sources, `/commit-push-pr` auto-approval tightening) has
  no MCP transport, registration, or auth surface.

- **Claude Code target bumped to 2.1.228** (from 2.1.226) in `.claude-code-version`.
  The 2.1.227 + 2.1.228 delta needs no server-side change — nothing in it touches
  MCP transport, registration, or the pass-through-auth design this server
  documents. Reviewed against this repo's surfaces: the 2.1.227
  `claude-code-action` fix (Bash commands failing when `allowed_non_write_users` is
  set on GitHub-hosted runners) does not affect `.github/workflows/claude.yml`,
  which gates by author association and never sets that input; 2.1.228's
  duplicate deferred-tools reminder fix is host-side and this server's tools were
  never affected differently either way; and 2.1.228's Vertex AI credential
  fail-fast concerns the host's own model credentials, not MCP bearer tokens —
  a Production Master tool-call 401 still means the service token, as
  troubleshooting already states. The rest of the delta (self-hosted-runner,
  Remote Control, and cross-session-messaging fixes, a Write-tool rule change for
  newer models, UI polish) is host-side with no server surface.

- **Claude Code target bumped to 2.1.226** (from 2.1.224) in `.claude-code-version`.
  The 2.1.225 + 2.1.226 delta needs no server-side change: 2.1.226 is fix-only
  ("bug fixes and reliability improvements"), and 2.1.225's two auth fixes are
  client-side and produce 401s *elsewhere in the same session* that read like
  server auth failures, so troubleshooting's 401 section now lists both to be
  ruled out while keeping token validation as the answer to a Production Master
  tool-call 401 — neither can cause one. The macOS keychain-timeout bug hit **MCP
  OAuth** servers, and this server uses pass-through bearer auth; co-registered
  OAuth servers 401ing alongside it is the shared symptom that points at the host.
  The headless (`claude -p`) bug swapped a long-lived `CLAUDE_CODE_OAUTH_TOKEN`
  for a short-lived one, and that credential authenticates Claude Code itself to
  Anthropic — this server never sees it. The registration flows (`claude mcp add
  --transport http` / stdio) and the pass-through design are unchanged.

- **Claude Code target bumped to 2.1.224** (from 2.1.223) in `.claude-code-version`.
  The 2.1.224 delta is MCP-facing for once: it fixes MCP tools that connect
  mid-turn being deferred for tool search without their names announced to the
  model (a "connected but the model can't see the tools" symptom that reads like
  a server bug), surfaces sandbox violation details in Bash tool results, and
  adds sandbox credential-masking options for keeping tokens out of what the
  model sees. All are host-side; the registration flows (`claude mcp add
  --transport http` / stdio) and the pass-through-auth design are unchanged and
  no server-side change is required. Troubleshooting and Usage now reference
  these where they affect diagnosis (see Added below).

- **Claude Code target bumped to 2.1.223** (from 2.1.222) in `.claude-code-version`.
  The 2.1.223 delta contains nothing MCP-facing: its fixes are host-side
  (permission-prompt spoofing, a Bash permission bypass, a workflow-script sandbox
  escape, gateway model-discovery and `modelOverrides` corrections) and its one
  behavior change relevant to clients — `/review` becoming an alias of
  `/code-review` — touches no documented flow here. The registration flows
  (`claude mcp add --transport http` / stdio) and the pass-through-auth design are
  unaffected; no server-side change required.

- **Claude Code target bumped to 2.1.222** (from 2.1.220) in `.claude-code-version`.
  Troubleshooting's headless (`claude -p`) guidance now covers the 2.1.221 fix for
  `--mcp-config` servers not being connected before the first turn in print mode —
  the failure mode where a first-turn tool call is emitted as literal text, which
  reads like a server bug and isn't one. The 2.1.222 delta is client-side fix-only
  for MCP servers: tool errors are now shown for tools that disappear locally
  (e.g. after a server is removed mid-session), and `/usage` no longer
  overattributes usage to MCP servers — both are host fixes needing no
  server-side change; the documented registration flows are unchanged.

### Added
- **Troubleshooting: "connected but no tools" mid-turn case is version-scoped (Claude Code 2.1.224).**
  The transport-mismatch section now separates the config-shape cause from the
  Claude Code pre-2.1.224 bug where a server connecting mid-turn had its tools
  deferred for tool search without their names announced to the model — a
  symptom that reads like a server-side tool-listing failure and is fixed by
  updating the client. Connectivity guidance also notes that since 2.1.224
  sandbox violation details appear in Bash tool results, so a sandboxed `curl`
  probe of `<server-url>/mcp` that hits sandbox policy no longer masquerades as
  a generic network failure.
- **Usage: sandbox credential-masking note for the bearer token (Claude Code 2.1.224).**
  The bearer pass-through section now points users who keep their token in an
  env var and call the endpoint from sandboxed commands at 2.1.224's masking
  options (`extract`/`onExtractNoMatch`, `decode: "jwt"` with `maskClaims`),
  including their constraints: they require `network.tlsTerminate` and are
  honored only from user, managed, or `--settings` settings.
- Server packages under `packages/*` (populated via subsequent PRs).
- **Troubleshooting: diagnose connections with `claude mcp list` (Claude Code 2.1.219).**
  The connectivity section now leads with Claude Code's improved failure output —
  HTTP status and error text per failing server entry, warnings for hidden
  leading/trailing whitespace in MCP config values (a classic cause of a
  "looks right but fails" bearer header), and the headless `mcp_server_errors`
  init field for CI checks that the server registered cleanly.
- **`.claude-code-version` — tracked Claude Code target release (2.1.220).** New root
  file recording the latest Claude Code release this repo targets as an MCP client
  host, so version-support updates are diffable and automatable. Reviewed the Claude
  Code 2.0.0 → 2.1.220 changelog for MCP-facing changes: the documented registration
  flows (`claude mcp add --transport http` / stdio) are unchanged, and client-side
  improvements (capability-discovery retries, `claude mcp login`/`logout`, headersHelper
  re-auth on 401/403) require no server-side changes to the planned pass-through-auth
  design.

## [0.1.0] - 2026-07-13

### Added
- Initial public scaffold of the MCP server repository: README, documentation tree, contributing guide, and CI.
- Documented the standard-MCP-server-over-hosted-service architecture ([ADR-001](docs/engineering/decisions/ADR-001-initial-architecture.md)): Streamable HTTP (`POST /mcp`) and stdio transports, opaque bearer pass-through, tool schemas from `@production-master/mcp-tool-contract`.
- Empty npm workspaces layout (`packages/*`) ready to be populated.

[Unreleased]: https://github.com/ProductionMasterAI/production-master-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ProductionMasterAI/production-master-mcp/releases/tag/v0.1.0
