import { getSpec, setSpecUrl, setCredentials } from '../spec-loader.js';
import { getEnvUrl, isValidEnv } from '../config.js';
import { ENV_NAMES } from '../types.js';
import type { ToolResult } from '../types.js';

interface SwitchEnvInput {
  env: string;
  username?: string;
  password?: string;
}

export async function switchEnv(input: SwitchEnvInput): Promise<ToolResult> {
  if (!isValidEnv(input.env)) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Invalid environment "${input.env}". Valid options: ${ENV_NAMES.join(', ')}`,
      }],
    };
  }

  const newUrl = getEnvUrl(input.env);
  setSpecUrl(newUrl);

  if (input.username && input.password) {
    setCredentials(input.username, input.password);
  }

  const spec = await getSpec();
  const endpointCount = Object.values(spec.paths ?? {}).reduce((sum, pathItem) => {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    return sum + methods.filter((m) => (pathItem as Record<string, unknown>)[m]).length;
  }, 0);

  return {
    content: [{
      type: 'text',
      text: `Switched to environment "${input.env}". Loaded ${endpointCount} endpoints.`,
    }],
  };
}

export const switchEnvToolDef = {
  name: 'switchEnv',
  description: `Switches the active API environment. Clears cache and reloads the spec. Valid: ${ENV_NAMES.join(', ')}`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      env: { type: 'string', description: `Environment name: ${ENV_NAMES.join(', ')}` },
      username: { type: 'string', description: 'Override Basic Auth username' },
      password: { type: 'string', description: 'Override Basic Auth password' },
    },
    required: ['env'],
  },
};
