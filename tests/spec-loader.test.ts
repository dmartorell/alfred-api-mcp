import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

const mockSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Alfred API', version: '1.0.0' },
  tags: [{ name: 'bookings', description: 'Booking endpoints' }],
  paths: {
    '/bookings': {
      get: {
        tags: ['bookings'],
        summary: 'List bookings',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: {
    schemas: {
      Booking: { type: 'object', properties: { id: { type: 'string' } } },
    },
  },
};

vi.mock('@apidevtools/swagger-parser', () => ({
  default: {
    dereference: vi.fn(),
  },
}));

vi.mock('../src/config.ts', () => ({
  getConfig: vi.fn().mockReturnValue({
    specUrl: 'https://example.com/api.yaml',
    username: 'user',
    password: 'pass',
  }),
}));

describe('SpecLoader', () => {
  beforeEach(async () => {
    vi.resetModules();
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    vi.mocked(SwaggerParser.dereference).mockResolvedValue(mockSpec as never);
  });

  it('loads spec on first call', async () => {
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    const { getSpec } = await import('../src/spec-loader.ts');
    const spec = await getSpec();
    expect(SwaggerParser.dereference).toHaveBeenCalledTimes(1);
    expect(spec.tags).toHaveLength(1);
  });

  it('returns cached spec on second call', async () => {
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    const { getSpec } = await import('../src/spec-loader.ts');
    await getSpec();
    await getSpec();
    expect(SwaggerParser.dereference).toHaveBeenCalledTimes(1);
  });

  it('clearCache forces reload on next call', async () => {
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    const { getSpec, clearCache } = await import('../src/spec-loader.ts');
    await getSpec();
    clearCache();
    await getSpec();
    expect(SwaggerParser.dereference).toHaveBeenCalledTimes(2);
  });

  it('passes Basic Auth header to SwaggerParser', async () => {
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    const { getSpec } = await import('../src/spec-loader.ts');
    await getSpec();
    const callArgs = vi.mocked(SwaggerParser.dereference).mock.calls[0];
    const options = callArgs[1] as { resolve: { http: { headers: Record<string, string> } } };
    const authHeader = options.resolve.http.headers['Authorization'];
    expect(authHeader).toBe('Basic ' + Buffer.from('user:pass').toString('base64'));
  });

  it('setSpecUrl clears cache and uses new URL', async () => {
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    const { getSpec, setSpecUrl } = await import('../src/spec-loader.ts');
    await getSpec();
    setSpecUrl('https://new-env.com/api.yaml');
    await getSpec();
    const calls = vi.mocked(SwaggerParser.dereference).mock.calls;
    expect(calls[1][0]).toBe('https://new-env.com/api.yaml');
  });
});
