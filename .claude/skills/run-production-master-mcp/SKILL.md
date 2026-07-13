---
name: run-production-master-mcp
description: Build, test, and lint the production-master-mcp workspaces, and run the MCP server locally once packages land. Use before opening a PR or when verifying a local checkout is healthy. Triggers on "run the server", "build and test", "run the checks", "verify the repo".
user-invocable: true
---

# run-production-master-mcp

Local verification and run helper for this npm-workspaces monorepo. Run every gate the way
CI does, in order, and stop at the first failure. Prefer the `make` targets (they wrap the
npm scripts).

## Verify

1. **Install** — clean, reproducible install from the lockfile:

   ```bash
   make install        # npm ci
   ```

2. **Build all workspaces** — compile every package under `packages/*`:

   ```bash
   make build          # npm run build
   ```

3. **Test** — run the full test suite:

   ```bash
   make test           # npm test
   ```

4. **Lint** — the same lint gate CI enforces (warnings fail the build):

   ```bash
   make lint           # npm run lint
   ```

## Run the server locally

> **Status:** the server packages under `packages/*` are being populated via PRs. A local
> run target becomes available once the first package lands.

Once packages land, start the server in development mode:

```bash
make dev             # npm run dev --workspaces --if-present
```

This runs the MCP server locally over the stdio transport (and the HTTP transport on its
configured port). Connect an MCP client to it as described in
[`docs/user/quick-start.md`](../../../docs/user/quick-start.md). Configuration specifics
(including the upstream service endpoint) are defined as the packages land.

## Reporting

- Report each step as pass/fail with the command that proved it.
- On failure, show the failing output (trimmed) and stop — do not continue to later steps.
- Only report the repo as healthy when the verify steps all pass; cite the final command's
  output as evidence.
