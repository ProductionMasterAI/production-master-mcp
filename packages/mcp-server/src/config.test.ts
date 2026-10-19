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

  it('rejects an invalid PORT loudly, naming the variable', () => {
    process.env.PORT = 'eighty';
    expect(() => getHttpPort()).toThrow(/PORT must be a positive integer, got "eighty"/);
  });
});
