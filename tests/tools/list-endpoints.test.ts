import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

vi.mock('../../src/spec-loader.ts', () => ({ getSpec: vi.fn() }));

const mockSpec: Partial<OpenAPIV3.Document> = {
  paths: {
    '/bookings': {
      get: { tags: ['bookings'], summary: 'List bookings', responses: {} },
      post: { tags: ['bookings'], summary: 'Create booking', responses: {} },
    },
    '/users/{id}': {
      get: { tags: ['users'], summary: 'Get user', responses: {} },
    },
  },
};

describe('listEndpoints', () => {
  beforeEach(async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue(mockSpec as OpenAPIV3.Document);
  });

  it('throws when no filter provided', async () => {
    const { listEndpoints } = await import('../../src/tools/list-endpoints.ts');
    const result = await listEndpoints({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('filter');
  });

  it('filters by tag', async () => {
    const { listEndpoints } = await import('../../src/tools/list-endpoints.ts');
    const result = await listEndpoints({ tag: 'bookings' });
    expect(result.content[0].text).toContain('/bookings');
    expect(result.content[0].text).not.toContain('/users/{id}');
  });

  it('filters by path substring', async () => {
    const { listEndpoints } = await import('../../src/tools/list-endpoints.ts');
    const result = await listEndpoints({ path: 'users' });
    expect(result.content[0].text).toContain('/users/{id}');
    expect(result.content[0].text).not.toContain('/bookings');
  });

  it('filters by method', async () => {
    const { listEndpoints } = await import('../../src/tools/list-endpoints.ts');
    const result = await listEndpoints({ method: 'post' });
    expect(result.content[0].text).toContain('POST');
    expect(result.content[0].text).not.toContain('GET');
  });

  it('combines tag + method filters', async () => {
    const { listEndpoints } = await import('../../src/tools/list-endpoints.ts');
    const result = await listEndpoints({ tag: 'bookings', method: 'get' });
    expect(result.content[0].text).toContain('GET');
    expect(result.content[0].text).toContain('List bookings');
    expect(result.content[0].text).not.toContain('Create booking');
  });
});
