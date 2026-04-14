import type { OpenAPIV3 } from 'openapi-types';
import { getSpec } from '../spec-loader.js';
import type { ToolResult } from '../types.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface ListEndpointsInput {
  tag?: string;
  path?: string;
  method?: string;
}

export async function listEndpoints(input: ListEndpointsInput): Promise<ToolResult> {
  if (!input.tag && !input.path && !input.method) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'At least one filter is required: tag, path, or method.' }],
    };
  }

  const spec = await getSpec();
  const results: string[] = [];
  const methodFilter = input.method?.toLowerCase() as HttpMethod | undefined;

  for (const [pathKey, pathItem] of Object.entries(spec.paths ?? {})) {
    if (input.path && !pathKey.includes(input.path)) continue;

    for (const method of HTTP_METHODS) {
      if (methodFilter && method !== methodFilter) continue;
      const op = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | undefined;
      if (!op) continue;
      if (input.tag && !(op.tags ?? []).includes(input.tag)) continue;

      results.push(`${method.toUpperCase()} ${pathKey}${op.summary ? ` — ${op.summary}` : ''}`);
    }
  }

  if (results.length === 0) {
    return { content: [{ type: 'text', text: 'No endpoints match the given filters.' }] };
  }

  return { content: [{ type: 'text', text: results.join('\n') }] };
}

export const listEndpointsToolDef = {
  name: 'listEndpoints',
  description: 'Lists API endpoints. At least one filter (tag, path, or method) is required.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tag: { type: 'string', description: 'Filter by tag name' },
      path: { type: 'string', description: 'Filter by path substring' },
      method: { type: 'string', description: 'Filter by HTTP method (get, post, etc.)' },
    },
    required: [],
  },
};
