import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getHttpPort } from './config.js';

describe('getHttpPort', () => {
  let saved: { explicit?: string; platform?: string };

  beforeEach(() => {
    saved = { explicit: process.env.PM_MCP_HTTP_PORT, platform: process.env.PORT };
    delete process.env.PM_MCP_HTTP_PORT;
    delete process.env.PORT;
  });

  afterEach(() => {
    for (const [name, value] of [
      ['PM_MCP_HTTP_PORT', saved.explicit],
      ['PORT', saved.platform],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('defaults to 3000 when neither variable is set', () => {
    expect(getHttpPort()).toBe(3000);
  });

  it('honours PORT, as injected by container platforms such as Cloud Run', () => {
    process.env.PORT = '8080';
    expect(getHttpPort()).toBe(8080);
  });

  it('lets PM_MCP_HTTP_PORT override PORT', () => {
    process.env.PORT = '8080';
    process.env.PM_MCP_HTTP_PORT = '9090';
    expect(getHttpPort()).toBe(9090);
  });

  it('treats an empty value as unset', () => {
    process.env.PM_MCP_HTTP_PORT = '';
    process.env.PORT = '';
    expect(getHttpPort()).toBe(3000);
    process.env.PORT = '8080';
    expect(getHttpPort()).toBe(8080);
  });

  it('accepts the bounds of the port range', () => {
    process.env.PORT = '1';
    expect(getHttpPort()).toBe(1);
    process.env.PORT = '65535';
    expect(getHttpPort()).toBe(65535);
  });

  // Whitespace is rejected, not trimmed: it only arrives through a quoting
  // mistake, and accepting it would hide that the value isn't what was meant.
  it.each(['eighty', '8080junk', '8080.5', '0', '65536', ' 8080', '8080 ', '-1', '+8080', '0x1f90'])(
    'rejects %j loudly for both variables, naming the variable',
    (raw) => {
      process.env.PORT = raw;
      expect(() => getHttpPort()).toThrow(
        `PORT must be an integer port from 1 to 65535, got "${raw}"`,
      );
      process.env.PORT = '8080';
      process.env.PM_MCP_HTTP_PORT = raw;
      expect(() => getHttpPort()).toThrow(
        `PM_MCP_HTTP_PORT must be an integer port from 1 to 65535, got "${raw}"`,
      );
    },
  );
});
