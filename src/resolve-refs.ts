import type { OpenAPIV3 } from 'openapi-types';

function resolvePointer(spec: OpenAPIV3.Document, ref: string): unknown {
  const pointer = ref.replace(/^#\//, '');
  const parts = pointer.split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~').replace(/%7B/g, '{').replace(/%7D/g, '}').replace(/%3F/g, '?').replace(/%5B/g, '[').replace(/%5D/g, ']').replace(/%3D/g, '=').replace(/%26/g, '&').replace(/%22/g, '"'));
  let current: unknown = spec;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function resolveRefs(value: unknown, spec: OpenAPIV3.Document, visited = new Set<string>(), depth = 0): unknown {
  if (depth > 8 || value == null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(item => resolveRefs(item, spec, visited, depth + 1));
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj['$ref'] === 'string') {
    const ref = obj['$ref'] as string;
    if (!ref.startsWith('#/') || visited.has(ref)) return { '$ref': ref };
    visited.add(ref);
    const resolved = resolvePointer(spec, ref);
    const result = resolveRefs(resolved, spec, visited, depth + 1);
    visited.delete(ref);
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = resolveRefs(val, spec, visited, depth + 1);
  }
  return result;
}
