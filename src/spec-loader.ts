import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
import { getConfig } from './config.js';

let cachedSpec: OpenAPIV3.Document | null = null;
let activeUrl: string | null = null;

export async function getSpec(): Promise<OpenAPIV3.Document> {
  if (cachedSpec) return cachedSpec;

  const { specUrl, username, password } = getConfig();
  const url = activeUrl ?? specUrl;
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  cachedSpec = (await SwaggerParser.dereference(url, {
    resolve: {
      http: {
        headers: { Authorization: authHeader },
      },
    },
  })) as OpenAPIV3.Document;

  return cachedSpec;
}

export function clearCache(): void {
  cachedSpec = null;
}

export function setSpecUrl(url: string): void {
  activeUrl = url;
  cachedSpec = null;
}
