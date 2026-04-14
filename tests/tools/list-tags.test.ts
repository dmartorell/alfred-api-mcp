import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';

vi.mock('../../src/spec-loader.ts', () => ({
  getSpec: vi.fn(),
}));

const mockSpec: Partial<OpenAPIV3.Document> = {
  tags: [
    { name: 'bookings', description: 'Booking endpoints' },
    { name: 'users', description: 'User management' },
    { name: 'noDesc' },
  ],
};

describe('listTags', () => {
  beforeEach(async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue(mockSpec as OpenAPIV3.Document);
  });

  it('returns all tags with name and description', async () => {
    const { listTags } = await import('../../src/tools/list-tags.ts');
    const result = await listTags();
    expect(result.content[0].text).toContain('bookings');
    expect(result.content[0].text).toContain('Booking endpoints');
    expect(result.content[0].text).toContain('users');
  });

  it('handles tags without description', async () => {
    const { listTags } = await import('../../src/tools/list-tags.ts');
    const result = await listTags();
    expect(result.content[0].text).toContain('noDesc');
    expect(result.isError).toBeFalsy();
  });

  it('returns empty message when no tags defined', async () => {
    const { getSpec } = await import('../../src/spec-loader.ts');
    vi.mocked(getSpec).mockResolvedValue({ ...mockSpec, tags: [] } as OpenAPIV3.Document);
    const { listTags } = await import('../../src/tools/list-tags.ts');
    const result = await listTags();
    expect(result.content[0].text).toContain('No tags');
  });
});
