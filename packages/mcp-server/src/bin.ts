#!/usr/bin/env node
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
  console.error('production-master-mcp: fatal error', error);
  process.exitCode = 1;
});
