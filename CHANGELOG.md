# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Server packages under `packages/*` (populated via subsequent PRs).

## [0.1.0] - 2026-07-13

### Added
- Initial public scaffold of the MCP server repository: README, documentation tree, contributing guide, and CI.
- Documented the standard-MCP-server-over-hosted-service architecture ([ADR-001](docs/engineering/decisions/ADR-001-initial-architecture.md)): Streamable HTTP (`POST /mcp`) and stdio transports, opaque bearer pass-through, tool schemas from `@production-master/mcp-tool-contract`.
- Empty npm workspaces layout (`packages/*`) ready to be populated.

[Unreleased]: https://github.com/ProductionMasterAI/production-master-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ProductionMasterAI/production-master-mcp/releases/tag/v0.1.0
