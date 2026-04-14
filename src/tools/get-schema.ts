import { getSpec } from '../spec-loader.js';
import type { ToolResult } from '../types.js';

interface GetSchemaInput {
  name: string;
}

export async function getSchema(input: GetSchemaInput): Promise<ToolResult> {
  const spec = await getSpec();
  const schema = spec.components?.schemas?.[input.name];

  if (!schema) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Schema "${input.name}" not found in #/components/schemas` }],
    };
  }

  return { content: [{ type: 'text', text: JSON.stringify(schema, null, 2) }] };
}

export const getSchemaToolDef = {
  name: 'getSchema',
  description: 'Returns the JSON schema for a component from #/components/schemas/{name}.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Schema name, e.g. Booking' },
    },
    required: ['name'],
  },
};
