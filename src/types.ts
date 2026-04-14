export const ENV_NAMES = [
  'prod',
  'preprod',
  'testing1',
  'testing2',
  'testing3',
  'testing4',
  'testing5',
  'testing6',
  'testing7',
  'testing8',
] as const;

export type EnvName = (typeof ENV_NAMES)[number];

export interface EndpointSummary {
  path: string;
  method: string;
  summary?: string;
  tags?: string[];
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
