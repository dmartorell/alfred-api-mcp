import { getSpec } from '../spec-loader.js';
import type { ToolResult } from '../types.js';

export async function listTags(): Promise<ToolResult> {
  const spec = await getSpec();
  const tags = spec.tags ?? [];

  if (tags.length === 0) {
    return { content: [{ type: 'text', text: 'No tags defined in the API spec.' }] };
  }

  const lines = tags.map((t) => `- **${t.name}**${t.description ? `: ${t.description}` : ''}`);
  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

export const listTagsToolDef = {
  name: 'listTags',
  description: 'Lists all API tags with their descriptions.',
  inputSchema: { type: 'object' as const, properties: {}, required: [] },
};
