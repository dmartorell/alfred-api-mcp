import { getSpec } from '../spec-loader.js';
import type { ToolResult } from '../types.js';
import type { OpenAPIV3 } from 'openapi-types';

interface GetEndpointInput {
  path: string;
  method: string;
}

export async function getEndpoint(input: GetEndpointInput): Promise<ToolResult> {
  const spec = await getSpec();
  const pathItem = spec.paths?.[input.path];

  if (!pathItem) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Endpoint not found: ${input.path}` }],
    };
  }

  const method = input.method.toLowerCase();
  const op = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | undefined;

  if (!op) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Method ${input.method.toUpperCase()} not found on ${input.path}` }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(op, null, 2) }],
  };
}

export const getEndpointToolDef = {
  name: 'getEndpoint',
  description: 'Returns full detail of an endpoint: parameters, request body, responses, and schemas.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'API path, e.g. /bookings/{id}' },
      method: { type: 'string', description: 'HTTP method, e.g. get, post' },
    },
    required: ['path', 'method'],
  },
};
