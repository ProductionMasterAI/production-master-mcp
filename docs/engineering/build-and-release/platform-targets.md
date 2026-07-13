# Platform targets

One-sentence purpose: the MCP client platform versions this server is validated against.

Machine-readable source of truth: [`platform-targets.json`](platform-targets.json).
The README badge row must match `validated_against` for each target.

| Platform | Validated against | Latest known |
|---|---|---|
| Claude Code | pending | pending |
| Cursor | pending | pending |
| Codex | pending | pending |
| OpenCode | pending | pending |

All targets are `pending` because the server packages have not landed yet — the repo is
scaffold-only. When the server is first validated against a client, set
`validated_against` to the client version it was tested with, update `latest_known`,
refresh `last_reviewed`, and sync the README badges in the same PR.
