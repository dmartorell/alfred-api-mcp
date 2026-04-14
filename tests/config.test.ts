import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('getConfig', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAPI_SPEC_URL', 'https://example.com/api.yaml');
    vi.stubEnv('OPENAPI_USERNAME', 'user');
    vi.stubEnv('OPENAPI_PASSWORD', 'pass');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('returns config when all vars present', async () => {
    const { getConfig } = await import('../src/config.ts');
    const cfg = getConfig();
    expect(cfg).toEqual({
      specUrl: 'https://example.com/api.yaml',
      username: 'user',
      password: 'pass',
    });
  });

  it('throws when OPENAPI_SPEC_URL missing', async () => {
    vi.stubEnv('OPENAPI_SPEC_URL', '');
    const { getConfig } = await import('../src/config.ts');
    expect(() => getConfig()).toThrow('OPENAPI_SPEC_URL');
  });

  it('throws when OPENAPI_USERNAME missing', async () => {
    vi.stubEnv('OPENAPI_USERNAME', '');
    const { getConfig } = await import('../src/config.ts');
    expect(() => getConfig()).toThrow('OPENAPI_USERNAME');
  });

  it('throws when OPENAPI_PASSWORD missing', async () => {
    vi.stubEnv('OPENAPI_PASSWORD', '');
    const { getConfig } = await import('../src/config.ts');
    expect(() => getConfig()).toThrow('OPENAPI_PASSWORD');
  });
});

describe('getEnvUrl', () => {
  it('returns prod URL for prod', async () => {
    const { getEnvUrl } = await import('../src/config.ts');
    expect(getEnvUrl('prod')).toContain('alfredapp.com');
  });

  it('returns testing6 URL pattern', async () => {
    const { getEnvUrl } = await import('../src/config.ts');
    expect(getEnvUrl('testing6')).toContain('testing6');
    expect(getEnvUrl('testing6')).toContain('internal-api-gateway.yaml');
  });

  it('returns preprod URL', async () => {
    const { getEnvUrl } = await import('../src/config.ts');
    expect(getEnvUrl('preprod')).toContain('preprod');
  });
});

describe('isValidEnv', () => {
  it('accepts valid env names', async () => {
    const { isValidEnv } = await import('../src/config.ts');
    expect(isValidEnv('prod')).toBe(true);
    expect(isValidEnv('testing1')).toBe(true);
    expect(isValidEnv('testing8')).toBe(true);
    expect(isValidEnv('preprod')).toBe(true);
  });

  it('rejects invalid env names', async () => {
    const { isValidEnv } = await import('../src/config.ts');
    expect(isValidEnv('staging')).toBe(false);
    expect(isValidEnv('testing9')).toBe(false);
    expect(isValidEnv('')).toBe(false);
  });
});
