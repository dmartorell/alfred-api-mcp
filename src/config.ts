import 'dotenv/config';
import { ENV_NAMES, type EnvName } from './types.js';

const TESTING_BASE = 'alfredstaging.com';
const SPEC_PATH = '/internal-docs/internal-api-gateway.yaml';

const ENV_URLS: Record<EnvName, string> = {
  prod: `https://services.alfredapp.com${SPEC_PATH}`,
  preprod: `https://services.preprod.alfredstaging.com${SPEC_PATH}`,
  testing1: `https://services.testing1.${TESTING_BASE}${SPEC_PATH}`,
  testing2: `https://services.testing2.${TESTING_BASE}${SPEC_PATH}`,
  testing3: `https://services.testing3.${TESTING_BASE}${SPEC_PATH}`,
  testing4: `https://services.testing4.${TESTING_BASE}${SPEC_PATH}`,
  testing5: `https://services.testing5.${TESTING_BASE}${SPEC_PATH}`,
  testing6: `https://services.testing6.${TESTING_BASE}${SPEC_PATH}`,
  testing7: `https://services.testing7.${TESTING_BASE}${SPEC_PATH}`,
  testing8: `https://services.testing8.${TESTING_BASE}${SPEC_PATH}`,
};

export interface Config {
  specUrl: string;
  username: string;
  password: string;
}

export function getConfig(): Config {
  const specUrl = process.env.OPENAPI_SPEC_URL;
  const username = process.env.OPENAPI_USERNAME;
  const password = process.env.OPENAPI_PASSWORD;

  if (!specUrl) throw new Error('Missing required env var: OPENAPI_SPEC_URL');
  if (!username) throw new Error('Missing required env var: OPENAPI_USERNAME');
  if (!password) throw new Error('Missing required env var: OPENAPI_PASSWORD');

  return { specUrl, username, password };
}

export function getEnvUrl(env: EnvName): string {
  return ENV_URLS[env];
}

export function getPasswordForEnv(env: EnvName): string | undefined {
  if (env === 'prod') return process.env.OPENAPI_PASSWORD;
  return process.env.OPENAPI_TESTING_PASSWORD ?? process.env.OPENAPI_PASSWORD;
}

export function isValidEnv(env: string): env is EnvName {
  return (ENV_NAMES as readonly string[]).includes(env);
}
