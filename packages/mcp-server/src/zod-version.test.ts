import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { investigationMcpToolSchemas } from '@production-master/mcp-tool-contract';

// GHSA-mrhx-c7xc-m3w5: zod < 4.6.6 can exhaust memory validating oversized collections. The
// published @production-master/mcp-tool-contract@0.1.0 declares zod ^3, so the root
// package.json `overrides` forces every copy onto a patched zod 4. These checks fail if that
// override is dropped or stops applying (npm keeps an existing lockfile entry over an override).
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

  it('generic evidence needs a payload under zod 4 (was optional under zod 3)', () => {
    const schema = investigationMcpToolSchemas.add_evidence;
    expect(schema.safeParse({ investigationId: 'i1', evidence: { type: 'note' } }).success).toBe(false);
    expect(
      schema.safeParse({ investigationId: 'i1', evidence: { type: 'note', payload: null } }).success,
    ).toBe(true);
  });
});
