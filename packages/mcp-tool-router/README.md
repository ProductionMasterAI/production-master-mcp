# @production-master/mcp-tool-router

Internal routing layer for [`@production-master/mcp`](https://www.npmjs.com/package/@production-master/mcp).
It maps `investigation.*` MCP tool calls onto the Production Master hosted service's
public `/v1/*` REST API, validating arguments against the shared
`@production-master/mcp-tool-contract` and forwarding the caller's bearer token opaquely.

It makes no authorization decisions of its own — the hosted service is the sole authority
on identity and scope — and it never stores, logs, or echoes back the forwarded token.

**You probably want `@production-master/mcp` instead.** This package is published only so
that the server package resolves for outside installers; its API is an implementation
detail and may change without a major bump.

MIT licensed.
