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

5. **Typecheck** — a stricter pass than build (also part of CI):

   ```bash
   npm run typecheck
   ```

## Run the server locally

Set `PM_API_URL` to the Production Master REST API base and (for stdio) `PM_SESSION_JWT`
to your session token, then:

```bash
# stdio transport (default)
PM_API_URL=<api-base-url> PM_SESSION_JWT=<your-token> \
  npm run dev --workspace=@production-master/mcp

# Streamable HTTP transport — POST /mcp on PM_MCP_HTTP_PORT (default 3000);
# bearer is per-request, so no PM_SESSION_JWT here
PM_API_URL=<api-base-url> \
  npm run dev --workspace=@production-master/mcp -- --http
```

`make dev` (`npm run dev --workspaces --if-present`) runs the same script across every
workspace that defines one — today that is just `@production-master/mcp`. Connect an MCP
client to it as described in
[`docs/user/quick-start.md`](../../../docs/user/quick-start.md); the full config reference
is [`docs/user/reference/commands.md`](../../../docs/user/reference/commands.md).

## Reporting

- Report each step as pass/fail with the command that proved it.
- On failure, show the failing output (trimmed) and stop — do not continue to later steps.
- Only report the repo as healthy when the verify steps all pass; cite the final command's
  output as evidence.
