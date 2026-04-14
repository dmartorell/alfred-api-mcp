import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

vi.mock('../../src/spec-loader.ts', () => ({ getSpec: vi.fn() }));

const mockSpec: Partial<OpenAPIV3.Document> = {
  paths: {
    '/bookings/common-area': {
      get: {
        tags: ['bookings'],
        summary: 'List common area bookings',
        description: 'Returns bookings for shared spaces',
        responses: {},
      },
    },
    '/users': {
      get: { tags: ['users'], summary: 'List users', responses: {} },
    },
  },
};

describe('searchEndpoints', () => {
  beforeEach(async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue(mockSpec as OpenAPIV3.Document);
  });

  it('finds endpoint by path keyword', async () => {
    const { searchEndpoints } = await import('../../src/tools/search-endpoints.ts');
    const result = await searchEndpoints({ query: 'common-area' });
    expect(result.content[0].text).toContain('/bookings/common-area');
  });

  it('finds endpoint by summary keyword', async () => {
    const { searchEndpoints } = await import('../../src/tools/search-endpoints.ts');
    const result = await searchEndpoints({ query: 'shared spaces' });
    expect(result.content[0].text).toContain('/bookings/common-area');
  });

  it('returns no results message for unknown query', async () => {
    const { searchEndpoints } = await import('../../src/tools/search-endpoints.ts');
    const result = await searchEndpoints({ query: 'xyznonexistent' });
    expect(result.content[0].text).toContain('No endpoints');
  });

  it('search is case-insensitive', async () => {
    const { searchEndpoints } = await import('../../src/tools/search-endpoints.ts');
    const result = await searchEndpoints({ query: 'COMMON-AREA' });
    expect(result.content[0].text).toContain('/bookings/common-area');
  });
});
