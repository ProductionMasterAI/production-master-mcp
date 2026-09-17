#!/usr/bin/env node
import { getApiBaseUrl, scrubToken } from './tool-router/index.js';
import { startHttpServer } from './http.js';
import { startStdioServer } from './stdio.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--http')) {
    // Resolve the upstream origin BEFORE listening. Otherwise a hosted relay
    // started without PM_API_URL binds its port, passes `GET /health`, gets
    // marked ready, and only fails on the first real tool call — a pod that
    // looks healthy while every request it serves is broken. Failing at
    // startup makes the misconfiguration a crash loop an operator sees.
    getApiBaseUrl();
    startHttpServer();
    return;
  }
  await startStdioServer();
}

main().catch((error: unknown) => {
  // The error's message, never the error object: an object can carry request
  // or environment context, and this is the one log site that would otherwise
  // print whatever a failing layer chose to attach. Scrubbed against the
  // stdio session token too, since that transport reads its bearer from the
  // environment and a fatal error raised after startup has it in scope.
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `production-master-mcp: fatal error: ${scrubToken(message, process.env.PM_SESSION_JWT ?? '')}`,
  );
  process.exitCode = 1;
});
