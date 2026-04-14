#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyResult = any;

  switch (name) {
    case 'listTags':
      return listTags() as AnyResult;
    case 'listEndpoints':
      return listEndpoints(input) as AnyResult;
    case 'searchEndpoints':
      return searchEndpoints(input as { query: string }) as AnyResult;
    case 'getEndpoint':
      return getEndpoint(input as { path: string; method: string }) as AnyResult;
    case 'getSchema':
      return getSchema(input as { name: string }) as AnyResult;
    case 'switchEnv':
      return switchEnv(input as { env: string }) as AnyResult;
    default:
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
      } as AnyResult;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
