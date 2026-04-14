import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

vi.mock('../../src/spec-loader.ts', () => ({ getSpec: vi.fn() }));

const mockSpec: Partial<OpenAPIV3.Document> = {
  paths: {
    '/bookings/{id}': {
      get: {
        tags: ['bookings'],
        summary: 'Get booking by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Booking found' },
          '404': { description: 'Not found' },
        },
      },
    },
  },
};

describe('getEndpoint', () => {
  beforeEach(async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue(mockSpec as OpenAPIV3.Document);
  });

  it('returns full endpoint detail for valid path+method', async () => {
    const { getEndpoint } = await import('../../src/tools/get-endpoint.ts');
    const result = await getEndpoint({ path: '/bookings/{id}', method: 'get' });
    expect(result.content[0].text).toContain('Get booking by ID');
    expect(result.content[0].text).toContain('"id"');
    expect(result.content[0].text).toContain('200');
    expect(result.isError).toBeFalsy();
  });

  it('returns error for unknown path', async () => {
    const { getEndpoint } = await import('../../src/tools/get-endpoint.ts');
    const result = await getEndpoint({ path: '/unknown', method: 'get' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('returns error for wrong method on known path', async () => {
    const { getEndpoint } = await import('../../src/tools/get-endpoint.ts');
    const result = await getEndpoint({ path: '/bookings/{id}', method: 'post' });
    expect(result.isError).toBe(true);
  });
});
