# Troubleshooting

If something isn't working, find your symptom below. Most issues fall into one of four buckets: **auth**, **connectivity**, **Node version**, or **transport mismatch**.

## Auth failures

Authentication is pass-through — the server forwards your `Authorization: Bearer <token>` to the hosted service and makes no auth decision itself. So an auth error almost always comes from upstream.

### Tool calls return `401`

The token is missing or expired. Check that your MCP client is actually sending an `Authorization: Bearer <token>` header (HTTP) or is configured to pass your token (stdio), and that the token is current. Refresh it in your client and retry.

**Validate the token first — neither of the following can produce a 401 on a Production Master tool call.** Two Claude Code 2.1.225 bugs cause 401s *elsewhere in the same session* and are easy to mistake for this one, so they are listed to be ruled out, not as an alternative diagnosis:

- On macOS, a timed-out keychain read could make an **MCP OAuth** server fail with a burst of 401s as if never authenticated. This server uses pass-through bearer auth, not MCP OAuth, so it is not in that path — but if OAuth-based servers registered in the same session are 401ing too, that shared symptom is the host bug, and updating Claude Code fixes those entries. It does not explain a 401 on a Production Master tool call, which still means the bearer header is missing, wrong, or expired.
- In headless (`claude -p`) runs, a transient 401 could replace a long-lived `CLAUDE_CODE_OAUTH_TOKEN` with a stored login's short-lived token, breaking the session until restart. That credential authenticates **Claude Code itself to Anthropic** — this server never sees it and never uses it. A CI job where the model's own requests start failing hit that bug; a CI job where only `production-master` tool calls 401 has a token problem, and the fix is to re-issue the bearer token and update the client configuration.

### Tool calls return `403`

The token is valid but your account lacks access to the requested operation on the hosted service. Confirm your account has the needed access; the server cannot grant it — authorization is decided upstream.

### The token seems to "not stick"

There is nothing to persist on the server side — it stores no credentials. If calls stop authenticating, the fix is always in what your client sends next; update the token in your client configuration.

## Connectivity

### The client can't reach the HTTP endpoint

For the Streamable HTTP transport the client posts to `<server-url>/mcp`. Verify the URL is the bare endpoint (no trailing slash issues), that it's reachable from your machine, and that any proxy or firewall allows the connection. A proxy that buffers or drops long-lived responses can interfere — try a direct connection to isolate it.

**Claude Code:** start with `claude mcp list` (or `/mcp` in a session). Since Claude Code 2.1.219 a failing server entry shows the HTTP status and error text of the failed connection — a `401` there points you at [auth](#auth-failures), a timeout or DNS error at the network path, and a `404` at a wrong endpoint URL. Claude Code also warns when an MCP config value carries hidden leading/trailing whitespace — a classic cause of an `Authorization` header that looks right but fails upstream. If you run Claude Code headless (`claude -p`), config entries that fail validation are skipped and reported in the init event's `mcp_server_errors` field, so a CI job can assert the server registered cleanly. One more headless gotcha with a version answer: before 2.1.221, servers passed via `--mcp-config` were not connected before the first turn in print mode, so a first-turn tool call could come out as literal text instead of a real call — if a CI transcript shows the model "writing" `production-master` tool calls as prose, update Claude Code to 2.1.221+ rather than debugging the server. Finally, if you probe the endpoint with `curl` from a **sandboxed** Claude Code session, a sandbox network denial used to look like a generic connection failure; since 2.1.224 the Bash tool result includes the sandbox violation details — which network (or file) access was denied and why — so you can tell sandbox policy apart from a real network problem before blaming the server or the proxy. One more symptom with a version answer: before 2.1.232, a server that failed to answer Claude Code's protocol-version probe — or answered it with a malformed reply (a proxy or captive portal returning HTML at `<server-url>/mcp` produces exactly this) — left the client **hanging for the full 30-second connect timeout** before reporting failure. On 2.1.232+ the failure surfaces immediately with error text in `claude mcp list`. If registering this server appears to hang for ~30 seconds and then fail, update Claude Code first; the immediate error you then get points at the real cause (usually a proxy rewriting the response or a wrong endpoint URL).

**If you operate this server behind a serverless runtime,** one more version answer, this time on the server-operator side rather than the client side: before 2.1.233, Claude Code could get stuck **endlessly reopening the MCP v2 subscriptions/listen stream** against a server hosted on a serverless platform, instead of settling after a normal reconnect. That reads as unexplained request-volume spikes, connection churn, or elevated invocation counts in the hosted platform's logs — not as anything the server did — and every client hitting it looks like a misbehaving integration. On Claude Code 2.1.233+ the reconnect settles normally. If you see this pattern from Claude Code clients specifically, ask them to update rather than changing the server's connection handling.

**Headless (`claude -p`) or SDK sessions that never recover from a blip are a known bug fixed in 2.1.243.** Before 2.1.243, a remote MCP server connection (this server's Streamable HTTP transport included) that dropped mid-session in a non-interactive or SDK-driven Claude Code run could stay disconnected for the rest of that run instead of reconnecting — a CI job or agent pipeline would then see every later `production-master` tool call fail as if the server had gone down, even though a normal interactive session reconnects fine. As of 2.1.243, these sessions reconnect automatically or report the connection as failed instead of hanging in a broken state. If a headless or SDK integration against this server intermittently "loses" the tools partway through a run, update Claude Code before suspecting the server or its network path.

### Calls reach the server but fail upstream

If the server is reachable but tool calls fail, the failure happened between the server and the hosted service. Every such failure comes back as a tool error with a specific `error` code, so you can tell the causes apart instead of guessing — and none of them is ever reported as an empty-but-successful result:

| `error` | Means | What to do |
|---|---|---|
| `upstream_unauthorized` | The hosted service rejected your token (HTTP 401). | Mint a fresh token; check the client is sending the one you think it is. |
| `upstream_forbidden` | The token is valid but lacks scope for that call (HTTP 403). | Check the token's scope for the investigation you're addressing. |
| `upstream_not_found` | The hosted service has no such investigation or resource (HTTP 404). | Check the `investigationId`. |
| `upstream_rate_limited` | You are being throttled (HTTP 429). | Back off and retry. |
| `upstream_failed` | The hosted service returned some other non-2xx. | The `message` carries the service's own detail. |
| `upstream_unreachable` | The server could not open a connection at all (DNS, refused, timeout). | Check `PM_API_URL` and network egress from wherever the server runs. |
| `upstream_invalid_response` | A 2xx whose body was not valid JSON — usually a proxy or captive portal answering instead of the API. | Check `PM_API_URL` points at the API, not a gateway. |
| `relay_error` | The server itself threw while relaying. | Report it (see below); include the `message`. |

An `upstream_*` error's `message` may quote the hosted service's own error body to keep the failure diagnosable. Your bearer token is stripped out of that text before you ever see it — if the upstream ever echoed your `Authorization` header back into an error, it reaches you as `[redacted]`. The server also never writes the token to its logs; server logs record a failed request's method and path only, never its headers.

## Node version

The server targets **Node.js 22** (pinned in `.nvmrc`). If the server fails to start — especially over stdio, where your client launches it via `npx` — confirm Node 22 is installed and on `PATH`. Run `node --version`; if it isn't 22, `nvm use` in the repo or install Node 22.

## Transport mismatch

The server speaks two transports and they are not interchangeable in a single client entry:

- **Streamable HTTP** — the client connects to a running server at `<server-url>/mcp`. Use this for a hosted/remote server. The client entry needs a **URL** (and a bearer header), not a launch command.
- **stdio** — the client launches the server as a local subprocess and talks over standard I/O. The client entry needs a **command** (e.g. `npx …`), not a URL.

If your client "connects but sees no tools" or "fails to start," the usual cause is configuring one transport's shape (URL vs command) against the other. Match the entry to the transport you intend to use — see [Quick Start](quick-start.md).

**Claude Code:** one more "connected but no tools" case with a version answer. Before 2.1.224, an MCP server that finished connecting **mid-turn** — e.g. added or reconnected while the model was already working — could have its tools deferred for tool search without their names ever being announced to the model: the connection succeeds and `/mcp` lists the server, but the model acts as if the Production Master tools don't exist. This looks exactly like a server-side tool-listing bug and isn't one. On Claude Code 2.1.224+ mid-turn connections announce their tools correctly — if you hit this symptom, update Claude Code rather than re-registering or debugging the server.

## Still stuck?

Open a GitHub issue with your MCP client and version, the transport you used (HTTP or stdio), the server version, and the redacted output or log excerpt. Never include tokens or service credentials.

**Claude Code:** before 2.1.234, Claude Code's own MCP diagnostic output could leak secrets from a session. That was a host-side bug in Claude Code's diagnostics, not this server logging anything — the pass-through design already never logs the forwarded bearer token, on any version — but if you're on Claude Code 2.1.234+, pasting `claude mcp list` output or a session transcript into an issue is safer than it used to be. Redacting before you share is still the rule above, not a version-gated exception.

**Cursor:** if the server shows as connected in Customize / MCP but the model never calls Production Master tools, confirm the entry is the HTTP shape (`url` + `Authorization` header) rather than a stdio `command`, and that the bearer token is current. Team-distributed Team MCPs (Cursor 3.10+) use the same pass-through auth — a stale team-installed token fails the same way as a hand-edited `mcp.json`.
