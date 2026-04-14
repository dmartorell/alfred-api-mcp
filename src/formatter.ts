import type { OpenAPIV3 } from 'openapi-types';

function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length))
  );
  const pad = (s: string, w: number) => s.padEnd(w);
  const border = (l: string, m: string, r: string, f: string) =>
    l + widths.map(w => f.repeat(w + 2)).join(m) + r;
  const row = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c ?? '', widths[i])).join(' │ ') + ' │';

  return [
    border('┌', '┬', '┐', '─'),
    row(headers),
    border('├', '┼', '┤', '─'),
    ...rows.map(row),
    border('└', '┴', '┘', '─'),
  ].join('\n');
}

function schemaType(schema: unknown): string {
  if (!schema || typeof schema !== 'object') return 'unknown';
  const s = schema as Record<string, unknown>;
  if ('$ref' in s) return String(s.$ref).split('/').pop() ?? 'ref';
  const t = String(s.type ?? 'unknown');
  if (s.format) return `${t} (${s.format})`;
  if (t === 'array' && s.items) return `${schemaType(s.items)}[]`;
  return t;
}

function extractProperties(schema: unknown): { name: string; type: string }[] {
  if (!schema || typeof schema !== 'object') return [];
  const s = schema as Record<string, unknown>;
  if (s.type === 'array' && s.items) return extractProperties(s.items);
  const props = s.properties as Record<string, unknown> | undefined;
  if (!props) return [];
  return Object.entries(props).map(([name, val]) => ({ name, type: schemaType(val) }));
}

function schemaFromContent(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  const json = (o.content as Record<string, unknown> | undefined)?.['application/json'] as
    | Record<string, unknown>
    | undefined;
  return json?.schema;
}

export function formatParameters(params: unknown[]): string {
  const filtered = (params as OpenAPIV3.ParameterObject[]).filter(p => p.name);
  if (!filtered.length) return '(sin parámetros)';
  const rows = filtered.map(p => [p.name, p.in, schemaType(p.schema), p.required ? 'sí' : 'no']);
  return renderTable(['Nombre', 'In', 'Tipo', 'Requerido'], rows);
}

export function formatResponseSchema(response: unknown): string {
  const rawSchema = schemaFromContent(response);
  if (!rawSchema) return '(sin schema)';

  const s = rawSchema as Record<string, unknown>;
  const props = s.properties as Record<string, unknown> | undefined;

  let prefix = 'Response 200';
  let targetSchema: unknown = rawSchema;

  if (props?.data) {
    const dataSchema = props.data as Record<string, unknown>;
    if (dataSchema.type === 'array') {
      prefix = 'Response 200 — data[]:';
      targetSchema = dataSchema.items;
    }
  }

  const fields = extractProperties(targetSchema);
  if (!fields.length) return `${prefix}\n(sin campos)`;
  return `${prefix}\n${renderTable(['Campo', 'Tipo'], fields.map(f => [f.name, f.type]))}`;
}

export function formatRequestBodySchema(requestBody: unknown): string {
  const rawSchema = schemaFromContent(requestBody);
  if (!rawSchema) return '(sin schema)';
  const fields = extractProperties(rawSchema);
  if (!fields.length) return '(sin campos)';
  return `Request body:\n${renderTable(['Campo', 'Tipo'], fields.map(f => [f.name, f.type]))}`;
}

function parseFilterableFields(description: string | undefined): { field: string; operators: string }[] {
  if (!description) return [];
  const match = description.match(/\*\*Filterable fields:\*\*\n([\s\S]*?)(?:\n\n|$)/);
  if (!match) return [];
  return [...match[1].matchAll(/^- `([^`]+)`:\s*(.+)$/gm)].map(m => ({
    field: m[1],
    operators: m[2].trim(),
  }));
}

export function formatEndpoint(
  method: string,
  path: string,
  op: OpenAPIV3.OperationObject,
): string {
  const lines: string[] = [];
  lines.push(`${method.toUpperCase()} ${path}${op.summary ? ` — ${op.summary}` : ''}`);
  lines.push('');

  if (op.parameters?.length) {
    lines.push('Parámetros:');
    lines.push(formatParameters(op.parameters as unknown[]));
    lines.push('');
  }

  if (op.requestBody) {
    lines.push(formatRequestBodySchema(op.requestBody));
    lines.push('');
  }

  const r200 = op.responses?.['200'];
  if (r200) {
    lines.push(formatResponseSchema(r200));
  }

  const filterFields = parseFilterableFields(op.description);
  if (filterFields.length) {
    lines.push('');
    lines.push('Filterable fields (parámetro filter):');
    lines.push(renderTable(['Campo', 'Operadores'], filterFields.map(f => [f.field, f.operators])));
  }

  return lines.join('\n').trim();
}
