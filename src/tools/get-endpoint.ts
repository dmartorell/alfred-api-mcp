import { getSpec } from '../spec-loader.js';
import { resolveRefs } from '../resolve-refs.js';
import { formatParameters, formatResponseSchema, formatRequestBodySchema, formatEndpoint } from '../formatter.js';
import type { ToolResult } from '../types.js';
import type { OpenAPIV3 } from 'openapi-types';

interface GetEndpointInput {
  path: string;
  method: string;
  compact?: boolean;
  section?: string;
  resolve?: boolean;
  raw?: boolean;
}

function jsonOutput(value: unknown, spec: OpenAPIV3.Document, resolve: boolean): ToolResult {
  const data = resolve ? resolveRefs(value, spec) : value;
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function textOutput(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function compactResponses(
  responses: OpenAPIV3.ResponsesObject | undefined,
): Record<string, string> {
  if (!responses) return {};
  const result: Record<string, string> = {};
  for (const [code, resp] of Object.entries(responses)) {
    const r = resp as OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject;
    const description = '$ref' in r ? r.$ref : (r.description ?? '');
    result[code] = `${description} [use section='responses.${code}' for schema]`;
  }
  return result;
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

  const shouldResolve = input.resolve ?? false;
  const raw = input.raw ?? false;

  if (raw) {
    if (input.section) {
      if (input.section === 'requestBody') {
        if (!op.requestBody) {
          return { content: [{ type: 'text', text: `No request body for ${input.method.toUpperCase()} ${input.path}` }] };
        }
        return jsonOutput(op.requestBody, spec, shouldResolve);
      }
      if (input.section.startsWith('responses.')) {
        const code = input.section.split('.')[1];
        const response = op.responses?.[code];
        if (!response) {
          return { content: [{ type: 'text', text: `No response ${code} for ${input.method.toUpperCase()} ${input.path}` }] };
        }
        return jsonOutput(response, spec, shouldResolve);
      }
      if (input.section === 'parameters') {
        return jsonOutput(op.parameters ?? [], spec, shouldResolve);
      }
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown section "${input.section}". Valid: requestBody, responses.200, responses.404, parameters` }],
      };
    }
    if (input.compact) {
      const { responses: _responses, ...rest } = op;
      return jsonOutput(rest, spec, shouldResolve);
    }
    const { responses, ...rest } = op;
    return jsonOutput({ ...rest, responses: compactResponses(responses) }, spec, shouldResolve);
  }

  // Formatted output — always resolve refs for display
  if (input.section) {
    if (input.section === 'requestBody') {
      if (!op.requestBody) {
        return { content: [{ type: 'text', text: `No request body for ${input.method.toUpperCase()} ${input.path}` }] };
      }
      return textOutput(formatRequestBodySchema(resolveRefs(op.requestBody, spec)));
    }
    if (input.section.startsWith('responses.')) {
      const code = input.section.split('.')[1];
      const response = op.responses?.[code];
      if (!response) {
        return { content: [{ type: 'text', text: `No response ${code} for ${input.method.toUpperCase()} ${input.path}` }] };
      }
      return textOutput(formatResponseSchema(resolveRefs(response, spec)));
    }
    if (input.section === 'parameters') {
      return textOutput(formatParameters(resolveRefs(op.parameters ?? [], spec) as unknown[]));
    }
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown section "${input.section}". Valid: requestBody, responses.200, responses.404, parameters` }],
    };
  }

  return textOutput(formatEndpoint(input.method, input.path, resolveRefs(op, spec) as OpenAPIV3.OperationObject));
}

export const getEndpointToolDef = {
  name: 'getEndpoint',
  description:
    'Returns detail of an endpoint as a formatted table. Use section to fetch only what you need: "requestBody" (POST/PUT/PATCH body schema), "responses.200" (success response schema), "parameters" (path/query params). Use compact=true to omit responses entirely. Use raw=true only when you need to process the response to generate code.',
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
        description: 'If true, resolves $ref pointers inline. Only applies when raw=true.',
      },
      raw: {
        type: 'boolean',
        description: 'If true, returns raw JSON instead of a formatted table. Use only when generating code from the response.',
      },
    },
    required: ['path', 'method'],
  },
};
