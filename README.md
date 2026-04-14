# alfred-api-mcp

MCP server que expone el swagger interno de Alfred a Claude Code.

## Setup (5 min)

### 1. Credenciales

En el proyecto `alfredverticalsapp-gsd`, copia la plantilla de configuración:

```bash
cp .claude/settings.local.example.json .claude/settings.local.json
```

El archivo `settings.local.example.json` ya incluye las credenciales del equipo. El archivo `settings.local.json` es local y no se commitea.

> Las credenciales también están en Psono (entrada "alfred-api-mcp") por si necesitas cambiar de entorno o regenerarlas.

### 2. Activar el MCP

Reinicia Claude Code en `alfredverticalsapp-gsd`. Ejecuta `/mcp` — `alfred-api` debe aparecer sin warnings.

### 3. Verificar que el MCP funciona

Ejecuta:

```
listTags
```

Deberías ver la lista de tags del API de Alfred.

### 4. Verificar error de credenciales

Edita `settings.local.json` y cambia la contraseña por una incorrecta. Reinicia Claude Code y ejecuta `listTags`. Deberías ver un error claro de autenticación (401), no un crash silencioso.

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
