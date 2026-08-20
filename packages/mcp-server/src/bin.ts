#!/usr/bin/env node
import { scrubToken } from './tool-router/index.js';
import { startHttpServer } from './http.js';
import { startStdioServer } from './stdio.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--http')) {
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
