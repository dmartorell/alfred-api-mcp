import { getSpec } from '../spec-loader.js';
import { resolveRefs } from '../resolve-refs.js';
import type { ToolResult } from '../types.js';
import type { OpenAPIV3 } from 'openapi-types';

interface GetEndpointInput {
  path: string;
  method: string;
  compact?: boolean;
  section?: string;
  resolve?: boolean;
}

function output(value: unknown, spec: OpenAPIV3.Document, resolve: boolean): ToolResult {
  const data = resolve ? resolveRefs(value, spec) : value;
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
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

  const resolve = input.resolve ?? false;

  if (input.section) {
    if (input.section === 'requestBody') {
      if (!op.requestBody) {
        return { content: [{ type: 'text', text: `No request body for ${input.method.toUpperCase()} ${input.path}` }] };
      }
      return output(op.requestBody, spec, resolve);
    }

    if (input.section.startsWith('responses.')) {
      const code = input.section.split('.')[1];
      const response = op.responses?.[code];
      if (!response) {
        return { content: [{ type: 'text', text: `No response ${code} for ${input.method.toUpperCase()} ${input.path}` }] };
      }
      return output(response, spec, resolve);
    }

    if (input.section === 'parameters') {
      return output(op.parameters ?? [], spec, resolve);
    }

    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown section "${input.section}". Valid: requestBody, responses.200, responses.404, parameters` }],
    };
  }

  if (input.compact) {
    const { responses: _responses, ...rest } = op;
    return output(rest, spec, resolve);
  }

  return output(op, spec, resolve);
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
      resolve: {
        type: 'boolean',
        description: 'If true, resolves $ref pointers inline. Use with section to see the full expanded schema without references.',
      },
    },
    required: ['path', 'method'],
  },
};
