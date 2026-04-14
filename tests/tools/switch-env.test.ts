import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

vi.mock('../../src/spec-loader.ts', () => ({
  getSpec: vi.fn(),
  setSpecUrl: vi.fn(),
}));

vi.mock('../../src/config.ts', () => ({
  getEnvUrl: vi.fn((env: string) => `https://services.${env}.alfredstaging.com/internal-docs/internal-api-gateway.yaml`),
  isValidEnv: vi.fn((env: string) => ['prod', 'preprod', 'testing1', 'testing6'].includes(env)),
}));

const mockSpec = (endpointCount: number): Partial<OpenAPIV3.Document> => ({
  paths: Object.fromEntries(
    Array.from({ length: endpointCount }, (_, i) => [`/endpoint-${i}`, { get: { responses: {} } }])
  ),
});

describe('switchEnv', () => {
  beforeEach(async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue(mockSpec(5) as OpenAPIV3.Document);
  });

  it('switches to valid env and returns confirmation with endpoint count', async () => {
    const { switchEnv } = await import('../../src/tools/switch-env.ts');
    const result = await switchEnv({ env: 'testing6' });
    expect(result.content[0].text).toContain('testing6');
    expect(result.content[0].text).toContain('5');
    expect(result.isError).toBeFalsy();
  });

  it('calls setSpecUrl with new URL', async () => {
    const { setSpecUrl } = await import('../../src/spec-loader.ts');
    const { switchEnv } = await import('../../src/tools/switch-env.ts');
    await switchEnv({ env: 'testing6' });
    expect(vi.mocked(setSpecUrl)).toHaveBeenCalledWith(
      'https://services.testing6.alfredstaging.com/internal-docs/internal-api-gateway.yaml'
    );
  });

  it('returns error for invalid env name', async () => {
    const { switchEnv } = await import('../../src/tools/switch-env.ts');
    const result = await switchEnv({ env: 'testing99' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid environment');
  });
});
