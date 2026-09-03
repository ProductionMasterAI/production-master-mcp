# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Claude Code target bumped to 2.1.259** (from 2.1.258) in `.claude-code-version`.
  Reviewed the single-version 2.1.259 delta for MCP-facing changes. Three items bear
  on this server's documented behavior and got docs updates; the rest were reviewed
  and found not applicable.

  **`managedMcpServers` is new: an org admin can now push an HTTP/SSE MCP server to
  every user centrally** (same entry shape as `.mcp.json`) instead of asking each
  engineer to run `claude mcp add`. `production-master` qualifies — it is a
  Streamable HTTP server, and a `managedMcpServers` entry that names a launch
  command is skipped, so this reaches the HTTP transport only, never stdio. Quick
  Start's Claude Code HTTP section now documents this as an alternative rollout
  path, with the sample entry shape, alongside the existing Cursor Team MCP callout.

  That addition changes what an existing enterprise allow/deny policy actually
  covers: **`allowedMcpServers` now governs only user-added entries (`claude mcp
  add`, project `.mcp.json`) — a `managedMcpServers` entry loads regardless of it,
  and keeping it out now requires `deniedMcpServers`.** `production-master`
  registered the documented way (`claude mcp add`, no plugin manifest here) is
  still governed by `allowedMcpServers` exactly as before. But an org that adopts
  the new `managedMcpServers` rollout path above and also wants it blockable must
  use `deniedMcpServers`, not `allowedMcpServers` — the new Quick Start callout and
  the existing allow/deny bullet in Troubleshooting → Connectivity both now say so,
  so a `managedMcpServers` deployment an org meant to keep optional doesn't
  silently become mandatory.

  **"Connected but no tools" gets one more version answer.** Before 2.1.259, an MCP
  server that disconnected while Claude Code was still listing its tools could be
  left showing as connected with an empty tool list instead of a failed/disconnected
  state — the same symptom class as the mid-turn-connection bug fixed in 2.1.224,
  now closed for the tool-listing window too. Troubleshooting → Transport mismatch
  now names it next to the 2.1.224 note: if `production-master` shows connected in
  `/mcp` with no tools listed, update Claude Code before re-registering or debugging
  the server.

  Reviewed and not applicable, in roughly the published entry's order:
  `--permission-prompts none` (unattended-headless-host ergonomics, not this
  server's registration flow), `glab` MR recognition (this repo is hosted on GitHub
  only), `--json` for `claude plugin validate` (no `.claude-plugin/` manifest here),
  concurrent-session `~/.claude.json` reversion and the rejected-thinking
  every-later-turn bug (client-side session state), the Bash `Read()` deny-rule
  gaps fix (`.claude/settings.json` here is an allow-list with no deny rule for the
  gaps to matter to), the prompt-cache/OAuth-refresh and fullscreen-blank-conversation
  fixes, auto-mode running an unsupported frontmatter model and
  `CLAUDE_CODE_MAX_CONTEXT_TOKENS` on Vertex-style IDs (no `.claude/agents/` or model
  config here), the background GitHub-connection check on claude.ai launches,
  `--resume` on an empty attachment, frontmatter `model:` ignored interactively (no
  agents defined), the Artifact-publishing fix, managed `forceRemoteSettingsRefresh`
  at startup, hook-created-worktree isolation (no hooks defined), OpenTelemetry
  metrics missing user/org fields (no telemetry config here), the file-edit
  permission-dialog truncation and repository-detection fixes, managed settings now
  refusing to start when unparseable (this repo ships no managed-settings file of
  its own to get that wrong), Stop not stopping background agents and duplicate
  agents on workflow resume (no background agents or workflows defined), the
  marketplace trailing-slash `.git` fix (no marketplace here), blocking-Stop-hook
  reasoning loss (no hooks), the 60-second remote-session stall after a
  browser-hosted MCP server's page closes (this server is never browser-hosted),
  worktree-isolated Bash-loop refusals, terminal resize/render performance,
  `/workflows` JSON rendering (no workflows), the `/install-github-app` GitLab
  messaging change, and nested background-subagent transcripts (no subagents
  defined). One more MCP item, reviewed and left undocumented as too minor to
  warrant a Troubleshooting entry: headless/SDK sessions now finish connecting
  configured MCP servers roughly 50ms sooner at startup — a host-side speed-up
  with no behavior for this server's docs to describe.
- **Claude Code target bumped to 2.1.258** (from 2.1.257) in `.claude-code-version`.
  Reviewed the single-version 2.1.258 delta for MCP-facing changes: none found. Both
  items in that release are host-side fixes with no MCP transport, registration, or
  pass-through-auth surface here — a macOS 12 (Monterey) launch regression introduced
  in 2.1.255, and remote/scheduled sessions failing with "user messages must have
  non-empty content" after a re-sent permission approval could not be applied. Neither
  touches this server's HTTP/stdio transports, the documented `claude mcp add`
  registration flows, or the pass-through-auth design — no docs or code changes follow
  from this bump.
- **Claude Code target bumped to 2.1.257** (from 2.1.252) in `.claude-code-version`.
  2.1.253–2.1.256 do not exist as public releases, so the whole delta is the single
  2.1.257 entry. Reviewed it end to end for MCP-facing changes. Two items bear on
  this server's own documented behavior and got docs-only updates:

  `/mcp reconnect` and `/mcp enable` could previously reconnect a settings-file MCP
  server that a managed MCP allow/deny list — or `strictPluginOnlyCustomization`
  loaded after startup — should have blocked, evading the enterprise policy that was
  supposed to keep it out. `production-master` is registered exactly that way: an
  ordinary settings-file entry from `claude mcp add`, never a plugin-bundled server
  (this repo ships no `.claude-plugin/` manifest). An org relying on
  `strictPluginOnlyCustomization` or an allow/deny list to keep `production-master`
  out (or in) was relying on that enforcement holding across a reconnect, which it
  didn't before this fix. Troubleshooting's Connectivity section now names it, so a
  `production-master` registration that used to survive a reconnect it shouldn't
  have reads as a host-version answer, not a policy hole in this server.

  Claude Code's own MCP connection and OAuth debug/error logs now redact
  credentials carried in a server's URL or request headers. This server never
  implements MCP OAuth — pass-through bearer only, see `upstream.ts`'s
  `scrubToken` — and never logs the forwarded token on its own side either way. But
  a verbose or `--mcp-debug` Claude Code session logs *its own* view of the
  handshake, headers included, and until now that log lived entirely client-side,
  outside anything this server controls. Troubleshooting's "Still stuck?" section
  — which already carries the 2.1.234 note about diagnostic output leaking secrets
  — now also names this one: a debug log captured on Claude Code 2.1.257+ redacts
  the bearer out of that client-side view too, in addition to (never instead of)
  this server's own never-log-the-token design.

  Reviewed and not applicable, in roughly the published entry's order: Fable 5.1
  and gateway model-discovery `description` support (model selection — this
  server holds no LLM/model-provider SDK of any kind, the hard constraint in
  `AGENTS.md` §1 and CI's `no-llm-sdk` job); `timeFormat`/`timeZone`, `/effort s`,
  and the `/doctor` stale-sandbox-mask warning (terminal/session ergonomics with
  no server surface); the auto-mode Containment Escape rule and
  `permissions.blockReadsOutsideWorkingDirectories` (this repo's own scripts and
  CI never fetch cloud metadata credentials or read outside the working
  directory — nothing here does the kind of thing that rule exists to catch);
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` (this repo defines no `.claude/agents/`
  sub-agents, only the one build/test/lint skill, which spawns nothing); the
  WebSocket MCP connection error-logging fix (this server exposes Streamable
  HTTP and stdio only, never a WebSocket transport); the `claude mcp add/remove`
  FIFO/device-file-symlink hang fix and the `strictPluginOnlyCustomization`
  leftover-OAuth-credential cleanup (this repo ships no `.mcp.json` and this
  server holds no OAuth credentials to leave behind); the Bash `Read()`/`Edit()`
  deny-rule redirect/`tac`/`egrep` fix and the compound-command/subshell
  `permissions.ask` fix (`.claude/settings.json` here is an allow-list of
  specific commands with no security-relevant deny rule for either fix to
  matter to); the plugin-component symlinked-path fix (no `.claude-plugin/`
  manifest — this repo is not a plugin); `defaultMode: "bypassPermissions"` in
  project settings now being ignored (neither `.claude/settings.json` here sets
  a `defaultMode` at all); the self-hosted-runner git-push-negotiation
  improvement (`.claude/rules/constraints.md` §6 and every workflow under
  `.github/workflows/` run GitHub-hosted `ubuntu-latest` only — there is no
  self-hosted runner here to improve); `/code-review --comment` posting to
  GitLab via `glab` (this repo is hosted on GitHub only); and the sandboxed
  trailing-dot denied-domain fix (no `sandbox.network` policy is configured
  anywhere in this repo). Everything else in 2.1.257 — the VS Code session-list,
  model-picker, and archive-session changes; rendering-performance and
  prompt-input-responsiveness improvements; policy-helper, telemetry, and
  managed-settings diagnostics; Remote Control, `/btw` history, and `/schedule`
  changes; background-session, subagent-transcript, and prompt-cache
  reliability fixes; and the rest of the CLI/session-management fixes — is
  host- or client-side with no MCP transport, registration, or
  pass-through-auth surface here.
- **Claude Code target bumped to 2.1.252** (from 2.1.251) in `.claude-code-version`.
  Reviewed the single-version 2.1.252 delta for MCP-facing changes: none found.
  All four items in that release are host-side reliability fixes with no MCP
  transport, registration, or pass-through-auth surface here — a Bash "task
  output swap refused (tasks dir moved or linked)" failure on some Macs, an
  "always allow" permission rule not saving in a project that has no
  `.claude/settings.local.json` yet, Remote Control sessions hosted by Claude
  Desktop or VS Code stalling for minutes after a tool finished when the
  connection to claude.ai was degraded, and background task notifications
  with very large failure output overflowing the API request size limit.
  None of them touches this server's HTTP/stdio transports, the
  `headersHelper` guidance in Quick Start/Troubleshooting, or MCP
  server-name handling — no docs or code changes follow from this bump.

### Changed
- **Cursor 3.11 (+2026-08-27):** advance `changelog_date` **2026-08-19 → 2026-08-27**; desktop **3.16.29 → 3.18.9**. Document Cloud Agent **Start from scratch** (no SCM), Origin **Create repo**, **browser port-forward preview**, and optional **Vercel publish**. No server-side change. Cursor-only.
- **Cursor 3.11 (+2026-08-19):** document native **CreateGoal** / **UpdateGoal** beside Agent Window `/goal` in Quick Start (no server change). Cursor-only.

### Added
- **OIDC trusted-publishing wiring for `@production-master/mcp` (dev#644).**
  `release.yml` now publishes the package on a `v*` tag via npm OIDC trusted
  publishing — `id-token: write` plus an in-job npm upgrade pinned to
  `^11.5.1` (mirrors `production-master`'s release train, dev#725; `@latest`
  is unbounded across majors and has broken this exact train before).
  Deliberately no `NODE_AUTH_TOKEN`: with a token also wired, a green publish
  would not distinguish OIDC actually working from the token quietly
  carrying it, so the migration could never be verified. A tag whose version
  doesn't match `packages/mcp-server/package.json` fails the release before
  any publish is attempted. This wires the release train only — it does not
  cut a release or perform a publish; that still needs the trusted publisher
  configured on npmjs.com for this package (owner-side) and an explicit tag
  push.

- **Cursor 3.11 (+2026-08-19):** advance `changelog_date` **2026-08-17 → 2026-08-19** (desktop **3.16.29** unchanged). Document cloud-agent **Subscriptions**, **Custom Modes**, **isolated-VM subagents**, Agent Window **`/goal`**, and **non-interruptive steering** in Quick Start. No server-side change (protocol boundary only). Cursor-only; other platform nightlies untouched.

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
- **Claude Code target bumped to 2.1.251** (from 2.1.247) in `.claude-code-version`.
  Reviewed the 2.1.248–2.1.251 delta for MCP-facing changes. One item bears
  directly on this server's documented connection flow and got a docs update:
  2.1.248 fixes MCP servers whose `headersHelper` supplies the `Authorization`
  header falling into OAuth discovery on a `401` instead of re-running the
  helper and retrying the call, as documented. This server's own auth is
  pass-through bearer, never OAuth — but `headersHelper` is the option this
  repo's own Quick Start recommends over a static `--header` bearer for
  minting short-lived tokens, and on a pre-2.1.248 client a `headersHelper`
  entry that legitimately needed a fresh token on a `401` could misfire into
  an OAuth flow this server never supports, instead of the helper simply
  running again. Quick Start and Troubleshooting now name the fix, so a
  `headersHelper` setup that seemed to dead-end into an OAuth prompt reads as
  a host-version answer, not a reason to fall back to a static bearer.
  Reviewed and not applicable: 2.1.248 also fixes a project `.mcp.json` entry
  that declares the claude.ai connector type being mis-filed under the
  trusted "claude.ai" heading in `/mcp` — this server's entries are plain
  `--transport http`/stdio registrations, never that connector type. From
  2.1.251: the `/mcp reconnect` error-message fix and the SDK MCP server
  handshake-timeout fix are both Remote Control- and Agent-SDK-embedded-server
  surfaces this repo doesn't have (it registers as an ordinary external
  server, not an SDK-hosted in-process one); the MCP-server-name sanitization
  improvement and the `/schedule` MCP-servers-can't-attach-to-cloud-routines
  message are host-side polish with nothing for this server to change; and
  the `claude mcp add --header`/`add-json` help-text fix is a CLI wording
  correction only. 2.1.249 and 2.1.250 shipped no itemized MCP-facing changes
  ("Bug fixes and reliability improvements" only for 2.1.250; 2.1.249 does not
  appear in the public changelog). Everything else in 2.1.248–2.1.251
  (`--restricted`, agent `cacheTtl`, self-hosted-runner flags, spend-limit and
  prompt-cache status-line fields, `claude --help` subcommands, model-switch
  hooks, Remote Control subagent streaming, and the large body of session-
  management/CLI/security fixes) is host- or client-side with no MCP
  transport, registration, or pass-through-auth surface here.
- **Claude Code target bumped to 2.1.247** (from 2.1.246) in `.claude-code-version`.
  Reviewed the single-version 2.1.247 delta for MCP-facing changes. One item
  concerns this server's own surface and got a docs-only update: Bedrock-,
  Vertex-, and Foundry-backed Claude Code sessions are now told by the host
  when an MCP server connection fails, matching what direct-Anthropic-API
  sessions already did — previously that failure was visible only in
  `claude mcp list`/`/mcp`, not to Claude itself mid-turn. Troubleshooting's
  Connectivity section now names the fix, since a failed `production-master`
  registration on one of those gateways read as Claude silently proceeding
  without the tools rather than acknowledging the gap. Reviewed and not
  applicable, all host- or client-side with no MCP transport, registration,
  or auth surface here: `SendFeedback` and its `feedbackDrafts` setting
  (feedback-report drafting, no server hook); `spinnerTipsOverride`'s
  `{id, text, cooldownSessions, priority}`/`tipsFile`/`label` additions and
  the new Bash-permission-prompt tip (terminal UI); `/claude-api cost-optimize`
  and the `/claude-api` skill's new Admin API coverage (Claude API spend and
  org administration, no relation to this server's own MCP surface or its
  npm-published tool contract); the arrow-key/Enter, Ctrl-shortcut, and mouse-
  report input fixes, `/terminal-setup`'s Zed keymap merge fix, and the
  terminal-hyperlink/PR-badge/peer-message-collapse UI changes (all terminal
  rendering); the sub-agent first-call-404 fallback and the hook/background-
  agent output-overflow and memory-growth fixes — this repo defines no
  `.claude/agents/` sub-agents and no hooks in `.claude/settings.json`, only
  the one build/test/lint skill; the plugin-marketplace character-hardening
  and version-less marketplace-cache-directory fixes — this repo ships no
  `.claude-plugin/` manifest, it is not a plugin; the self-hosted-runner
  session-status fix — `.github/workflows/claude.yml` runs on GitHub-hosted
  `ubuntu-latest` only, per this repo's own no-self-hosted-runner rule
  (`.claude/rules/constraints.md` §6); `/rename`, `/compact`, `/install-github-app`,
  background-session and Remote-Control fixes, the Sonnet 5 auto-compact
  window change, and the analytics/sign-in/gateway changes (host account,
  session-management, and CLI-UX surfaces with no MCP-facing effect).
- **Claude Code target bumped to 2.1.246** (from 2.1.245) in `.claude-code-version`.
  Reviewed the single-version 2.1.246 delta for MCP-facing changes. One item
  bears directly on this server's own failure taxonomy: before 2.1.246, an MCP
  tool call interrupted mid-flight by an incoming message in a headless or
  remote session could be reported to the client as "completed with no
  output" — indistinguishable from a legitimate empty success — instead of an
  explicit interrupted error. That is exactly the ambiguity this server's own
  relay design refuses to allow (an upstream failure is never reported as an
  empty-but-successful result; see `upstream.ts`), so Troubleshooting now
  names the fix: a `production-master` tool call that "succeeded with
  nothing" in a headless/CI run on a pre-2.1.246 client may have actually been
  interrupted, not genuinely empty. Also documented: 2.1.246 further hardens
  non-interactive (`-p`/SDK/cloud) sessions by auto-continuing a response cut
  off mid-stream by a server error, connection loss, or stall, complementing
  the 2.1.243 dropped-connection reconnect fix already on record. Reviewed and
  not applicable: the fix for MCP tool arguments sent as JSON strings when a
  parameter's schema is empty (`{}`) — every tool here takes its schema from
  `@production-master/mcp-tool-contract`'s Zod definitions, none of which
  serialize to a bare `{}`; the fix for `requiresUserInteraction` tools
  offering an ignored "don't ask again" option — this server declares no tool
  with that flag, all twenty are plain relay calls; and the fix scoping
  telemetry/metrics credentials to their own gateway host — this server sends
  no telemetry to Anthropic. Everything else in 2.1.246 (Bash wildcard
  warnings, `/permissions` Auto mode tab, `/cd` live-reload, plugin/keybinding
  fixes, `/code-review` and `/goal` scheduling changes) is host- or
  editor-side and touches none of this server's transport, registration, or
  auth surfaces.
- **Claude Code target bumped to 2.1.245** (from 2.1.241) in `.claude-code-version`.
  Reviewed the 2.1.242–2.1.245 delta for MCP-facing changes. One item concerns
  this server's own surface and needed a docs-only update: 2.1.243 fixes remote
  MCP servers in non-interactive (`claude -p`) and SDK sessions never
  recovering after a dropped connection — they now reconnect automatically or
  report as failed instead of hanging silent. This server's Streamable HTTP
  transport is exactly the kind of remote MCP connection that regression
  affected, so Troubleshooting now names the fix so a stale-looking headless
  or SDK integration on an older Claude Code reads as a host-version answer,
  not a server bug. Also reviewed from 2.1.243: the `managed` marker `/mcp`
  and `/plugins` now show for claude.ai connectors whose auth is managed by
  an organization — noted in passing in Usage's bearer-token section, since
  it's a client-side display detail with no effect on this server's own
  pass-through behavior; and the fix for MCP sign-in from the desktop app
  failing with "Invalid redirect URI" on servers supporting client ID
  metadata documents (e.g. Linear) — not applicable, since this server uses
  pass-through bearer auth, never MCP OAuth or dynamic client registration
  (same distinction already on record in Troubleshooting's 401 section).
  2.1.242 and 2.1.244 shipped no separately documented changes, and 2.1.245
  shipped only a Linux-glibc-2.44 Claude Code startup crash fix — a host
  binary issue with no MCP-facing surface. Everything else in 2.1.242–2.1.245
  (auto mode, `/resume`, Remote Control, cross-session messaging, VS Code,
  billing/settings surfaces) is host- or client-side and touches none of this
  server's transport, registration, or auth surfaces.
- **Claude Code target bumped to 2.1.241** (from 2.1.238) in `.claude-code-version`.
  Reviewed the 2.1.239–2.1.241 delta for MCP-facing changes; none touch this
  server's transport, registration, or pass-through-auth surfaces, so no
  server-side or docs change was needed. 2.1.239's items are all host- or
  billing-side: the 1.1x US-only-inference cost premium for data-residency
  workspaces (`/cost`, status line, `--max-budget-usd`), a one-time
  fullscreen-renderer offer on Bedrock/Vertex/Foundry, a `/claude-api upgrade`
  helper that migrates *Python* projects off the `anthropic` 0.x SDK (this repo
  ships a TypeScript server and no Python client, so it's not applicable),
  `name@synced` labeling for plugins synced from claude.ai, a WebFetch
  cache-duration fix (15 minutes, was session-lifetime), a cloud-session
  idle-worker-restart/plan-mode fix, and Windows cross-session
  `SendMessage`/`ListAgents` parity — none of which is an MCP transport,
  registration, or auth surface. 2.1.240 and 2.1.241 each ship only as "Bug
  fixes and reliability improvements," with no itemized detail in the public
  changelog; neither release note names an MCP-protocol, transport, or
  pass-through-auth change, so there is nothing to act on beyond the version
  bump itself. Unlike the 2.1.236–2.1.238 bump below, this delta produced no
  docs change either — 2.1.238's `headersHelper` note in
  `docs/user/quick-start.md` remains current, since nothing in 2.1.239–2.1.241
  alters `headersHelper` or any other documented connection flow.
- **Claude Code target bumped to 2.1.238** (from 2.1.235) in `.claude-code-version`.
  Reviewed the 2.1.236–2.1.238 delta for MCP-facing changes. Two items concern this
  server's own surfaces and needed no server-side change after review: 2.1.238 fixes
  stdio MCP servers receiving a `server/discover` request before `initialize`, which
  used to force a "lazy" server to start its backend on every session open — this
  server has no eager backend connection on either transport (each tool call reaches
  the hosted service independently, lazily, per call), so the bug never had a
  symptom here, on any version. 2.1.238 also fixes MCP elicitation dialogs going
  blank for URLs over 4,096 characters; this server registers no elicitation, so it
  is not applicable. One item is genuinely useful to document: 2.1.238 tightens
  `headersHelper` — a project `.mcp.json` `headersHelper` now requires that folder's
  trust dialog to have been accepted (including under `claude -p`), and it runs
  without inherited shell credential env vars (user/managed/claude.ai-scope helpers
  now run from the Claude config dir instead). `headersHelper` mints the
  `Authorization` header via a command instead of a static value, which is a better
  fit for this server's bearer-token model than pasting a long-lived token into
  `--header`; noted as an option in `docs/user/quick-start.md` alongside the existing
  `--header` flow, with the 2.1.238 trust-dialog and env-var-scoping behavior stated
  so it matches what a reader hits in practice. The remaining 2.1.236–2.1.238 items
  (a `keybindingFlavor` setting, `ANTHROPIC_DEFAULT_MODEL`, `notify_when_idle` for
  cross-session `SendMessage`, the built-in "Concise" output style, self-hosted-runner
  and plugin-marketplace flags, prompt-cache/rendering/sandbox fixes) are host- or
  editor-side with no MCP transport, registration, or pass-through-auth surface, so
  they need no change here.
- **Claude Code target bumped to 2.1.235** (from 2.1.234) in `.claude-code-version`.
  The 2.1.235 delta contains nothing MCP-facing: it's editor/host-side polish —
  an optional `spellcheck` setting (`aspell`/`hunspell`/`ispell`), lower
  memory/CPU for background cloud sessions, reworded permission dialogs with a
  "don't ask again" option, faster-failing embedded `grep` on pathological
  patterns, `SendMessage` rejecting oversized messages upfront instead of
  silently dropping them, and a `/config` context-limit indicator when
  auto-compact is off — plus fixes for prompt-cache invalidation on language
  server disconnect, `Shift+Tab` in permission prompts over-granting
  session-wide permissions, the `Agent` tool's `subagent_type` error
  reporting, and assorted rendering glitches (nested markdown lists, notebook
  cell dialogs, slash commands mid-stream). None of it touches the documented
  `claude mcp add` registration flows, the MCP v2 transport, or the
  pass-through-auth design, so no server-side or docs change is required.
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
