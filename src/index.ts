#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { listTags, listTagsToolDef } from './tools/list-tags.js';
import { listEndpoints, listEndpointsToolDef } from './tools/list-endpoints.js';
import { searchEndpoints, searchEndpointsToolDef } from './tools/search-endpoints.js';
import { getEndpoint, getEndpointToolDef } from './tools/get-endpoint.js';
import { getSchema, getSchemaToolDef } from './tools/get-schema.js';
import { switchEnv, switchEnvToolDef } from './tools/switch-env.js';

const server = new Server(
  { name: 'alfred-api', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const TOOL_DEFS = [
  listTagsToolDef,
  listEndpointsToolDef,
  searchEndpointsToolDef,
  getEndpointToolDef,
  getSchemaToolDef,
  switchEnvToolDef,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const input = (args ?? {}) as Record<string, string>;

  const result = (() => {
    switch (name) {
      case 'listTags':
        return listTags();
      case 'listEndpoints':
        return listEndpoints(input);
      case 'searchEndpoints':
        return searchEndpoints(input as { query: string });
      case 'getEndpoint':
        return getEndpoint(input as { path: string; method: string });
      case 'getSchema':
        return getSchema(input as { name: string });
      case 'switchEnv':
        return switchEnv(input as { env: string; username?: string; password?: string });
      default:
        return Promise.resolve({
          isError: true,
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
        });
    }
  })();

  return result as unknown as Promise<CallToolResult>;
});

const transport = new StdioServerTransport();
await server.connect(transport);
