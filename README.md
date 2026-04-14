# alfred-api-mcp

MCP server que expone el swagger interno de Alfred a Claude Code.

## Setup (5 min)

### 1. Credenciales

Copia las credenciales de Psono (entrada "alfred-api-mcp") a tu `.env` en `alfredverticalsapp-gsd`:

```
OPENAPI_SPEC_URL=https://services.testing6.alfredstaging.com/internal-docs/internal-api-gateway.yaml
OPENAPI_USERNAME=<usuario>
OPENAPI_PASSWORD=<contraseña>
```

### 2. Verificar que el MCP funciona

En el proyecto `alfredverticalsapp-gsd`, lanza Claude Code. Ejecuta:

```
listTags
```

Deberías ver la lista de tags del API de Alfred.

### 3. Verificar error de credenciales

Pon una contraseña incorrecta en `.env`. Lanza Claude Code y ejecuta `listTags`. Deberías ver un error claro de autenticación (401), no un crash silencioso.

## Tools disponibles

| Tool | Uso |
|------|-----|
| `listTags` | Lista todos los tags del API |
| `listEndpoints` | Lista endpoints. Requiere al menos un filtro: `tag`, `path` o `method` |
| `searchEndpoints` | Busca por texto libre en paths, summaries y descriptions |
| `getEndpoint` | Detalle completo de un endpoint dado `path` y `method` |
| `getSchema` | Schema de `#/components/schemas/{name}` |
| `switchEnv` | Cambia entorno (prod, preprod, testing1–testing8), invalida caché |

## Flujo recomendado

```
listTags → listEndpoints(tag: "bookings") → getEndpoint(path: "/bookings", method: "post")
```

Para buscar sin conocer el tag: `searchEndpoints(query: "common area")`.

## Desarrollo local

```bash
npm install
npm test          # unit tests
npm run dev       # arrancar servidor en stdio
npm run build     # compilar a dist/
```
