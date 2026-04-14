import { getSpec } from '../spec-loader.js';
import type { ToolResult } from '../types.js';
import type { OpenAPIV3 } from 'openapi-types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

interface SearchEndpointsInput {
  query: string;
}

export async function searchEndpoints(input: SearchEndpointsInput): Promise<ToolResult> {
  const spec = await getSpec();
  const q = input.query.toLowerCase();
  const results: string[] = [];

  for (const [pathKey, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | undefined;
      if (!op) continue;

      const searchable = [
        pathKey,
        op.summary ?? '',
        op.description ?? '',
        ...(op.tags ?? []),
      ].join(' ').toLowerCase();

      const words = q.split(/\s+/).filter(Boolean);
      if (words.every(w => searchable.includes(w))) {
        results.push(`${method.toUpperCase()} ${pathKey}${op.summary ? ` — ${op.summary}` : ''}`);
      }
    }
  }

  if (results.length === 0) {
    return { content: [{ type: 'text', text: `No endpoints found matching "${input.query}".` }] };
  }

  return { content: [{ type: 'text', text: results.join('\n') }] };
}

export const searchEndpointsToolDef = {
  name: 'searchEndpoints',
  description: 'Full-text search across endpoint paths, summaries, and descriptions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
};
