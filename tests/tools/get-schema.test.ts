import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

vi.mock('../../src/spec-loader.ts', () => ({ getSpec: vi.fn() }));

const mockSpec: Partial<OpenAPIV3.Document> = {
  components: {
    schemas: {
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { type: 'string', format: 'date' },
        },
        required: ['id'],
      },
    },
  },
};

describe('getSchema', () => {
  beforeEach(async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue(mockSpec as OpenAPIV3.Document);
  });

  it('returns schema for known name', async () => {
    const { getSchema } = await import('../../src/tools/get-schema.ts');
    const result = await getSchema({ name: 'Booking' });
    expect(result.content[0].text).toContain('"id"');
    expect(result.content[0].text).toContain('"date"');
    expect(result.isError).toBeFalsy();
  });

  it('returns error for unknown schema', async () => {
    const { getSchema } = await import('../../src/tools/get-schema.ts');
    const result = await getSchema({ name: 'NonExistent' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('NonExistent');
  });

  it('returns error when no components defined', async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue({ openapi: '3.0.3', info: { title: '', version: '' }, paths: {} });
    const { getSchema } = await import('../../src/tools/get-schema.ts');
    const result = await getSchema({ name: 'Booking' });
    expect(result.isError).toBe(true);
  });
});
