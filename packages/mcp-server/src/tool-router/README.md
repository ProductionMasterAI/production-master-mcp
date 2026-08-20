# `tool-router/` — the upstream relay

Internal module of [`@production-master/mcp`](https://www.npmjs.com/package/@production-master/mcp).
It maps `investigation.*` MCP tool calls onto the Production Master hosted service's
public `/v1/*` REST API, validating arguments against the shared
`@production-master/mcp-tool-contract` and forwarding the caller's bearer token opaquely.

It makes no authorization decisions of its own — the hosted service is the sole authority
on identity and scope — and it never stores, logs, or echoes back the forwarded token.

## Why this is a directory and not a package

It shipped as a second published package, `@production-master/mcp-tool-router`, only so
that `@production-master/mcp` would resolve for an outside installer — a package serving a
dependency graph rather than a user. That is a second version cadence to keep in agreement
for an audience that does not exist yet, so it was folded in here before the first
registry write.

The module boundary is kept intact deliberately: everything the relay needs is in this
directory, its only entry point is `index.js`, and nothing outside it imports
`upstream.js` or `config.js` directly. If a second client for the `/v1/*` surface ever
appears, extracting this directory back into its own package is routine — which is the
cheap direction. Un-publishing a name is not.

The relay is **not** part of the published API of `@production-master/mcp`: the package's
`index.ts` exports the server surface only. Re-exporting `requestUpstream` would commit us
at first publish to the very compatibility obligation the consolidation avoided.
