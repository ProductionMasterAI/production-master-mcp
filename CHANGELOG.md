# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
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
