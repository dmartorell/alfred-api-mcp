import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
import { parse as parseYaml } from 'yaml';
import { getConfig } from './config.js';

let cachedSpec: OpenAPIV3.Document | null = null;
let activeUrl: string | null = null;

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

  const { specUrl, username, password } = getConfig();
  const url = activeUrl ?? specUrl;
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  cachedSpec = (await SwaggerParser.dereference(url, {
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

export function setSpecUrl(url: string): void {
  activeUrl = url;
  cachedSpec = null;
}
