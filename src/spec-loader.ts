import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
import { parse as parseYaml } from 'yaml';
import { getConfig } from './config.js';

let cachedSpec: OpenAPIV3.Document | null = null;
let activeUrl: string | null = null;
let activeCredentials: { username: string; password: string } | null = null;

const lenientYamlParser = {
  order: 200,
  allowEmpty: true,
  canParse: ['.yaml', '.yml', '.json'],
  async parse(file: { data: string | Buffer }) {
    let data = file.data;
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }
    if (typeof data === 'string') {
      return parseYaml(data, { uniqueKeys: false, strict: false });
    }
    return data;
  },
};

export async function getSpec(): Promise<OpenAPIV3.Document> {
  if (cachedSpec) return cachedSpec;

  const config = getConfig();
  const url = activeUrl ?? config.specUrl;
  const { username, password } = activeCredentials ?? config;
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  cachedSpec = (await SwaggerParser.bundle(url, {
    resolve: {
      http: {
        headers: { Authorization: authHeader },
      },
    },
    parse: {
      yaml: lenientYamlParser,
    },
  })) as OpenAPIV3.Document;

  return cachedSpec;
}

export function clearCache(): void {
  cachedSpec = null;
}

export function setCredentials(username: string, password: string): void {
  activeCredentials = { username, password };
  cachedSpec = null;
}

export function setSpecUrl(url: string): void {
  activeUrl = url;
  cachedSpec = null;
}
