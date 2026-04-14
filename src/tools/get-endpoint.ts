import { getSpec } from '../spec-loader.js';
import type { ToolResult } from '../types.js';
import type { OpenAPIV3 } from 'openapi-types';

interface GetEndpointInput {
  path: string;
  method: string;
  compact?: boolean;
  section?: string;
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

  if (input.section) {
    if (input.section === 'requestBody') {
      if (!op.requestBody) {
        return { content: [{ type: 'text', text: `No request body for ${input.method.toUpperCase()} ${input.path}` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(op.requestBody, null, 2) }] };
    }

    if (input.section.startsWith('responses.')) {
      const code = input.section.split('.')[1];
      const response = op.responses?.[code];
      if (!response) {
        return { content: [{ type: 'text', text: `No response ${code} for ${input.method.toUpperCase()} ${input.path}` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }

    if (input.section === 'parameters') {
      return { content: [{ type: 'text', text: JSON.stringify(op.parameters ?? [], null, 2) }] };
    }

    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown section "${input.section}". Valid: requestBody, responses.200, responses.404, parameters` }],
    };
  }

  if (input.compact) {
    const { responses: _responses, ...rest } = op;
    return {
      content: [{ type: 'text', text: JSON.stringify(rest, null, 2) }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(op, null, 2) }],
  };
}

export const getEndpointToolDef = {
  name: 'getEndpoint',
  description:
    'Returns detail of an endpoint. Use section to fetch only what you need: "requestBody" (POST/PUT/PATCH body schema), "responses.200" (success response schema), "parameters" (path/query params). Use compact=true to get everything except response schemas.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'API path, e.g. /bookings/{id}' },
      method: { type: 'string', description: 'HTTP method, e.g. get, post' },
      section: {
        type: 'string',
        description:
          'Fetch only one section: "requestBody", "responses.200", "responses.404", "parameters". Omit to get full endpoint.',
      },
      compact: {
        type: 'boolean',
        description: 'If true, omits all response schemas. Use when you only need request parameters/body.',
      },
    },
    required: ['path', 'method'],
  },
};
