import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { investigationMcpToolSchemas } from '@production-master/mcp-tool-contract';

// GHSA-mrhx-c7xc-m3w5: zod < 4.6.6 can exhaust memory validating oversized collections.
// @production-master/mcp-tool-contract@0.1.1 accepts `zod ^3.25.0 || ^4.6.6`, so npm dedupes
// it onto the server's patched zod 4 with no root `overrides`. These checks fail if a nested
// copy of an older zod reappears (for example a contract or SDK release that pins zod 3 again).
// `entry` is any specifier the package exports (the contract does not export package.json).
function resolvedZodVersion(entry: string): string {
  const req = createRequire(createRequire(import.meta.url).resolve(entry));
  return (req('zod/package.json') as { version: string }).version;
}

function atLeast(version: string, min: [number, number, number]): boolean {
  const parts = version.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts[i] !== min[i]) return parts[i] > min[i];
  }
  return true;
}

describe('zod resolution (GHSA-mrhx-c7xc-m3w5)', () => {
  for (const entry of ['@production-master/mcp-tool-contract', '@modelcontextprotocol/sdk/package.json']) {
    it(`${entry} resolves a patched zod (>= 4.6.6)`, () => {
      const version = resolvedZodVersion(entry);
      expect(atLeast(version, [4, 6, 6]), `zod ${version}`).toBe(true);
    });
  }

  it('generic evidence payload stays optional under zod 4 (contract 0.1.1)', () => {
    const schema = investigationMcpToolSchemas.add_evidence;
    expect(schema.safeParse({ investigationId: 'i1', evidence: { type: 'note' } }).success).toBe(true);
    expect(
      schema.safeParse({ investigationId: 'i1', evidence: { type: 'note', payload: null } }).success,
    ).toBe(true);
  });
});
