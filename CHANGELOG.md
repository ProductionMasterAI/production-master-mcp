# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **One published package, not two (dev#701).** `@production-master/mcp-tool-router`
  is folded into `@production-master/mcp` and is no longer published. It existed
  only so that `@production-master/mcp` would resolve for an outside installer — a
  package serving a dependency graph rather than a user — which bought a second
  version cadence to keep in agreement for an audience that does not exist yet, and
  a way for someone to install a router version that does not match their server.
  Settled before the first registry write, because the asymmetry decides it:
  extracting a package later is routine, deprecating a published name is not.
  The relay keeps its module boundary as `packages/mcp-server/src/tool-router/` —
  one entry point (`index.ts`), nothing outside it importing `upstream.ts` or
  `config.ts` — so a later extraction stays cheap. It is deliberately **not**
  re-exported from the package's public `index.ts`: committing `requestUpstream` to
  the published API at first publish would recreate the compatibility obligation
  this removes. No behaviour change; the 26-test suite is unchanged and green.
- **Upstream relay hardening: one relay path, a real failure taxonomy, and a
  proven-non-leaking bearer (dev#644, AD-23).** Every `/v1/*` call now goes
  through a single `requestUpstream` in the relay module, which is
  where the pass-through-auth contract and the failure taxonomy are stated
  once instead of being restated by each of the twenty tools. Upstream
  failures are classified — `upstream_unauthorized`, `upstream_forbidden`,
  `upstream_not_found`, `upstream_rate_limited`, `upstream_failed`,
  `upstream_unreachable`, `upstream_invalid_response` — so a caller can tell
  "no such investigation" from "the service is down" without parsing prose.
  Documented for users in `docs/user/troubleshooting.md`.
- **Relay seam tests (`packages/mcp-server/src/relay.test.ts`).** Eight tests
  drive the real MCP SDK `Client` through the real HTTP transport and router
  against a stand-in upstream, asserting the three properties neither side
  can show alone: the caller's credential reaches upstream unmodified, it
  appears in no log line and no tool result even when the upstream echoes it
  back, and an upstream failure is distinguishable from a legitimate empty
  result. Suite is 26 tests (was 16).
- **`@production-master/mcp` is publishable.** It carries `repository`,
  `license`, `files`, `engines`, and `prepublishOnly`; it had `private: true`,
  which would have made `npm publish` a no-op. Its one-time dependency on a
  sibling workspace package — which could never have resolved for an outside
  installer — is gone with the consolidation above, so the published tarball
  is self-contained apart from real registry dependencies.

### Fixed
- **Removed internal identifiers left in this PUBLIC repo (Hard rule 15).** Four
  references named private-side things an outside reader cannot see and should not
  need: a private-repo source path in the `ToolCallResult` doc comment, a
  server-side signing-secret variable name in an `upstream.ts` comment, a private
  cockpit doc path in `AGENTS.md`, and a dead `CHANGELOG` link to engineering docs
  that PR #5 had already removed. Each is rewritten to state the contract or the
  rule in terms a contributor here can act on. `ip-guard` passed on all four: its
  denylist is a finite list of known spellings, so it reports that nothing on the
  list is present, not that nothing internal is.

- **`list_actions` no longer reports an upstream failure as an empty action
  list.** Any non-2xx from `/v1/actions` returned `{ items: [] }` with
  `ok: true`, making a broken, throttled, or unauthorised upstream
  indistinguishable from an investigation that genuinely has no actions. It
  now surfaces the failure. Covered by a regression test that was confirmed
  to fail against the old behaviour. The mirror-image case is handled too: a
  legitimate `204 No Content` stays an empty *success* rather than becoming a
  false alarm.
- **Transport-level failures no longer escape as raw throws.** A refused or
  unresolvable upstream rejected out of `fetch` and propagated through the
  tool handler as an SDK protocol error carrying an arbitrary message from a
  layer this server does not control. It is now caught and reported as
  `upstream_unreachable`, and the tool handler has a backstop so nothing
  escapes unclassified. A 2xx with a non-JSON body — a proxy answering
  instead of the API — is likewise a failure rather than an empty result.
- **The forwarded bearer cannot ride out inside an upstream error body.**
  Relayed upstream detail is scrubbed of the caller's token before it reaches
  a tool result or a log line, so an upstream that reflects the
  `Authorization` header into its own error output cannot leak the credential
  into a client transcript. Server error logs now record a failed request's
  method and path only, never the error object, which is where request
  headers could have been reachable.
- **Pass-through auth can no longer be shadowed by a caller-supplied header.**
  `requestUpstream` sets `authorization` last, so an `init.headers`
  `authorization` cannot displace the token the relay was handed — every one
  of the twenty tools reaches upstream through this one function and may pass
  headers of its own.

### Changed
- **Docs no longer say `@production-master/mcp-tool-contract` is
  "publication pending".** It is published on npm at `0.1.0` and is consumed
  from the public registry; the stale claim appeared in `README.md`,
  `AGENTS.md`, `.claude/rules/constraints.md`, and two user docs.

- **Troubleshooting: diagnostic-sharing note is version-scoped (Claude Code 2.1.234).**
  "Still stuck?" now notes that Claude Code 2.1.234 fixes MCP diagnostic output
  (`claude mcp list` output, session transcripts) that could previously leak
  secrets from a session on the client side. The server's own never-log rule for
  the forwarded bearer token is unaffected either way; redacting before sharing
  stays the rule, not a version-gated exception.

### Changed
- **Claude Code target bumped to 2.1.234** (from 2.1.233) in `.claude-code-version`.
  The 2.1.234 delta's one MCP-facing item is a fix for MCP diagnostic output
  leaking secrets on the client side — directly relevant context for a server
  whose own hard rule is to never log or persist the forwarded bearer token (see
  `AGENTS.md` §Hard constraints and `.claude/rules/constraints.md`). The fix
  is entirely host-side: Claude Code's own diagnostic surfaces no longer risk
  leaking session secrets, which makes sharing `claude mcp list` output or a
  transcript when filing a Troubleshooting issue safer on 2.1.234+ than before —
  this server never had the leak (it never logs the token on any version), but
  the guidance to redact before sharing is now noted as belt-and-suspenders
  rather than the only safeguard. Documented in `docs/user/troubleshooting.md`
  (Still stuck?). Everything else in the delta is host-side with no MCP
  transport, registration, or auth surface: `CLAUDE_CODE_PROJECT_DIR_NAME`
  (per-project transcript directories), the `selection:clear` keybinding, the
  GitLab MR footer/statusline badge, auto-continue on usage-limit reset,
  account-email-only session identification, Windows NT-namespace path-read
  hardening, Remote Control cross-session/org fixes and permission/model/effort
  sync, `SendMessage`/`ListAgents` session-list fixes, transcript-markdown and
  error-message polish, the claude-api skill's context-size reduction,
  `/permissions` and `/add-dir` usable while Claude is working, `/goal`
  (`GOAL_CHECKIN_MINUTES`), removal of the "Default teammate model" setting,
  and background-task notifications moving to system-reminders — none touch the
  documented `claude mcp add` registration flows or the pass-through-auth
  design.
- **Cursor desktop 3.16.29 + Origin CLI/integrations:** re-pin desktop/`validated_against` **3.16.17 → 3.16.29** (stable download line 2026-08-18; no separate feature write-up). Document Origin CLI, agent-created Origin repos, and Origin↔Automations/Cloud Agents / apps integrations. Feature/date pins stay **3.11** / **2026-08-17**.
- **Cursor Origin + Builds default (2026-08-17).** Documented [Origin](https://cursor.com/docs/origin) (early-beta Cursor git forge; GitHub remains canonical for this public MCP server) and flipped Cloud Agent Builds language to **now default**. Pin bump: `changelog_date` **2026-08-13 → 2026-08-17**; feature **3.11** / desktop **3.16.17** unchanged.
- **Cursor Grok 4.6 + Builds T-1 readiness (2026-08-16).** Quick Start notes Grok 4.6 for long-running MCP debugging and T-1 Builds checklist before **2026-08-17** default. Pins stay **3.11** / **2026-08-13** / desktop **3.16.17**.
- **Cursor desktop 3.16.17 + Builds skipped/staleness docs.** Desktop pin **3.15.19 → 3.16.17**; Quick Start notes Builds Skipped checks, 24h staleness default, and install/start/terminals. Feature/date pins stay **3.11** / **2026-08-13**.
- **Cursor Builds Aug-17 readiness + CLI steer/`/goal`.** Quick Start notes enable-Builds-now (default **2026-08-17**), team/environment secrets for install, and CLI steer + durable `/goal` for local `agent` debugging (no server change). Pins stay **3.11** / **2026-08-13** / desktop **3.16.17**.
- **Cursor CLI Aug 11 tip.** Quick Start notes sticky skills + CLI plugin-hooks execution for local `agent` debugging (no server change).
- **Cursor currency (changelog through 2026-08-13 — Cloud Agent Builds).** `.cursor-version` keeps feature **3.11** / desktop CLI **3.16.17** and advances `changelog_date` to **2026-08-13**. Quick Start documents Cloud Agent Builds for faster MCP/server validation boots.
- **Cursor currency (desktop 3.16.17; Automations memory-file delete noted).** `.cursor-version` keeps feature **3.11** / **2026-08-03** and records `desktop_cli: 3.16.17`. Docs note Agent Plugins + desktop `workspaceOpen`.

### Added
- **MCP tool contract wiring and both transports implemented (dev#643, AD-23).**
  The relay module (`packages/mcp-server/src/tool-router/`) maps all 20
  `investigation.*` tools from the shared
  `@production-master/mcp-tool-contract` package onto the hosted `/v1/*` REST API,
  forwarding the caller's bearer opaquely and making no scope decisions of its own
  (AD-23 §5). `packages/mcp-server` (published as `@production-master/mcp`, CLI
  `production-master-mcp`) registers those tools on a real `McpServer` and serves
  them over both the Streamable HTTP transport (`POST /mcp`, stateless, one bearer
  per request from `Authorization`) and stdio (one bearer for the process's whole
  run, from `PM_SESSION_JWT`) — the two transports share one tool-registration
  function so they cannot drift. Seam-tested with the real MCP SDK `Client` against
  both transports (HTTP over a real socket; stdio spawning the real built binary),
  round-tripping through a stand-in `/v1/*` server — not a mock of the router's own
  schema. `@production-master/mcp-tool-contract` is published to public npm as
  `0.1.0` (owner-gated first publish, service#941); this PR depends on it as a
  normal npm dependency and does not redefine its schemas locally, per this repo's
  `AGENTS.md`.
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
- **Claude Code target bumped to 2.1.233** (from 2.1.232) in `.claude-code-version`.
  The 2.1.233 delta's one MCP-facing item bears directly on this server's own
  transport: before 2.1.233, an MCP v2 connection could have its
  subscriptions/listen stream **endlessly reopened by the client on serverless
  hosts** instead of settling after a normal reconnect, producing sustained
  connection churn against a Streamable HTTP endpoint like `<server-url>/mcp`
  rather than a one-off retry. Anyone running this server (or a fork of it)
  behind a serverless runtime who sees an unexplained burst of `/mcp`
  reconnects or elevated invocation counts from a Claude Code client should
  read that as this client bug, not a server defect — updating to 2.1.233+
  is the fix, not touching the server. Documented in
  `docs/user/troubleshooting.md` (Connectivity). The rest of the delta is
  host-side with no MCP transport, registration, or auth surface: GitLab
  merge-request URL support for `--worktree` / `claude agents` is dev-tooling
  UI; the opt-in `forward_user_identity` apps-gateway setting is model-gateway
  spend attribution; the opt-in Bash memory-cgroup support and
  `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS` are sandbox/tool-execution knobs
  unrelated to MCP; and the Notification-hook fix concerns permission-prompt
  hooks in Claude Desktop/VS Code, not tool calls to this server.
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
  deferred for tool search without their names ever announced to the model — a
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
- Documented the standard-MCP-server-over-hosted-service architecture: Streamable HTTP (`POST /mcp`) and stdio transports, opaque bearer pass-through, tool schemas from `@production-master/mcp-tool-contract`.
- Empty npm workspaces layout (`packages/*`) ready to be populated.

[Unreleased]: https://github.com/ProductionMasterAI/production-master-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ProductionMasterAI/production-master-mcp/releases/tag/v0.1.0
