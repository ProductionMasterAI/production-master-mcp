# Troubleshooting

If something isn't working, find your symptom below. Most issues fall into one of four buckets: **auth**, **connectivity**, **Node version**, or **transport mismatch**.

## Auth failures

Authentication is pass-through — the server forwards your `Authorization: Bearer <token>` to the hosted service and makes no auth decision itself. So an auth error almost always comes from upstream.

### Tool calls return `401`

The token is missing or expired. Check that your MCP client is actually sending an `Authorization: Bearer <token>` header (HTTP) or is configured to pass your token (stdio), and that the token is current. Refresh it in your client and retry.

### Tool calls return `403`

The token is valid but your account lacks access to the requested operation on the hosted service. Confirm your account has the needed access; the server cannot grant it — authorization is decided upstream.

### The token seems to "not stick"

There is nothing to persist on the server side — it stores no credentials. If calls stop authenticating, the fix is always in what your client sends next; update the token in your client configuration.

## Connectivity

### The client can't reach the HTTP endpoint

For the Streamable HTTP transport the client posts to `<server-url>/mcp`. Verify the URL is the bare endpoint (no trailing slash issues), that it's reachable from your machine, and that any proxy or firewall allows the connection. A proxy that buffers or drops long-lived responses can interfere — try a direct connection to isolate it.

### Calls reach the server but fail upstream

If the server is reachable but every tool call errors, the server may not be able to reach the hosted service. The upstream endpoint is configured for the server; those configuration specifics are defined as the packages land. Check the server's logs (never the tokens — those are never logged) for an upstream connection error.

## Node version

The server targets **Node.js 22** (pinned in `.nvmrc`). If the server fails to start — especially over stdio, where your client launches it via `npx` — confirm Node 22 is installed and on `PATH`. Run `node --version`; if it isn't 22, `nvm use` in the repo or install Node 22.

## Transport mismatch

The server speaks two transports and they are not interchangeable in a single client entry:

- **Streamable HTTP** — the client connects to a running server at `<server-url>/mcp`. Use this for a hosted/remote server. The client entry needs a **URL** (and a bearer header), not a launch command.
- **stdio** — the client launches the server as a local subprocess and talks over standard I/O. The client entry needs a **command** (e.g. `npx …`), not a URL.

If your client "connects but sees no tools" or "fails to start," the usual cause is configuring one transport's shape (URL vs command) against the other. Match the entry to the transport you intend to use — see [Quick Start](quick-start.md).

## Still stuck?

Open a GitHub issue with your MCP client and version, the transport you used (HTTP or stdio), the server version, and the redacted output or log excerpt. Never include tokens or service credentials.
