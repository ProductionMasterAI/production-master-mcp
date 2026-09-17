import { createRequire } from 'node:module';

/**
 * The version this server reports in the MCP `initialize` handshake, read from
 * this package's own `package.json` so a release bump cannot leave it behind
 * (it was a literal '0.1.0' in both transports). Resolves identically from
 * `src/` under vitest and `dist/` in the published tarball — `package.json`
 * ships in both.
 */
export const PACKAGE_VERSION: string = (
  createRequire(import.meta.url)('../package.json') as { version: string }
).version;
