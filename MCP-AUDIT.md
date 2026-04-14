# alfred-api-mcp: Audit Report

**Fecha:** 2026-04-14
**Método:** Tests ejecutados en vivo contra `services.alfredsmartdata.com` usando la implementación real del MCP (`SwaggerParser.bundle` + `lenientYamlParser`). Código fuente verificado en `src/spec-loader.ts`. Credenciales leídas del proceso MCP activo.

---

## Resumen ejecutivo

**WARN** — El MCP está bien estructurado. La recomendación crítica del audit anterior (cambiar `dereference` por `bundle`) **ya fue implementada**. Sin embargo, `getEndpoint` sigue siendo costoso en endpoints complejos: media de **1.078 tokens**, máximo de **7.552 tokens** (`GET /gateways/{gateway_id}`). El bug de `searchEndpoints` multi-palabra está confirmado (parcialmente mitigado por rutas con guiones). El resto (caché, listTags, listEndpoints) funciona correctamente.

---

## Métricas clave (medidas reales)

| Métrica | Valor | Valoración |
|---------|-------|-----------|
| Spec size (`bundle`) | 469 KB (~120.100 tokens) | — |
| Spec size (`dereference`) | 648 KB (~165.849 tokens) | — |
| Ratio `dereference`/`bundle` | **1,4x** | ✅ OK (no hay explosión exponencial) |
| Primera carga spec | **~1,1–1,3s** | ✅ OK |
| Cache hit | **0ms** | ✅ OK |
| `listTags` output | **344 tokens** (1.377 chars, 30 tags) | ✅ OK |
| `listEndpoints` (tag máximo, 26 eps) | **567 tokens** | ✅ OK |
| `getEndpoint` media (antes del fix) | ~~1.078 tokens~~ → **400 tokens** | ✅ OK |
| `getEndpoint` máximo (antes del fix) | ~~7.552 tokens~~ → **463 tokens** (`GET /gateways/{gateway_id}`) | ✅ OK |
| `getEndpoint` >3.000 tokens | ~~6 endpoints~~ → **0 endpoints** | ✅ OK |
| Tool definitions overhead | **636 tokens** (one-time al iniciar MCP) | ✅ OK |

### Top 10 endpoints más costosos (`getEndpoint`)

| Tokens | Endpoint |
|--------|----------|
| 7.552 | `GET /gateways/{gateway_id}` |
| 5.347 | `GET /projects/{project_id}` |
| 5.158 | `GET /projects/{project_id}/assets` |
| 3.971 | `GET /projects` |
| 3.813 | `POST /assets` |
| 3.567 | `POST /hotels/assets/check-in` |
| 3.085 | `GET /assets` |
| 3.005 | `GET /devices` |
| 2.700 | `GET /access/asset/{asset_id}` |
| 2.568 | `POST /devices` |

---

## Issues encontrados

### 🔴 Críticos

**1. `getEndpoint` en endpoints complejos: 3.000–7.500 tokens**

Con `bundle` (ya aplicado), los `$ref` siguen siendo resueltos inline cuando se serializa el pathItem completo. Los endpoints con schemas de respuesta ricos (`gateways`, `projects`, `assets`) tienen objetos anidados con arrays de URLs, campos de imagen y múltiples respuestas HTTP documentadas. Resultado: 6 endpoints superan los 3.000 tokens, y el peor (`GET /gateways/{gateway_id}`) llega a 7.552 tokens.

**Impacto:** Un flujo que consulte 3 endpoints complejos puede costar 15.000–22.000 tokens solo en tool outputs.

**Fix principal:** Post-procesar el output de `getEndpoint` para eliminar los response schemas de códigos 4xx/5xx cuando son el schema genérico `{ errors: [{ detail: string }] }`, añadiendo una nota `"Respuestas de error estándar: 400, 401, 403, 422, 500"`. Estimación: reducción del 30–50% en endpoints complejos.

**Fix alternativo:** Añadir un parámetro `compact: true` a `getEndpoint` que omita los response schemas y devuelva solo el request schema + summary.

---

### 🟡 Warnings

**2. `searchEndpoints` bug: queries multi-palabra buscan substring literal**

```typescript
// Actual (buggy):
if (searchable.includes(q)) { ... }
```

- `searchEndpoints("common areas")` → **13 resultados** (funciona porque los paths contienen `common-areas`)
- `searchEndpoints("common")` → 35 resultados
- `searchEndpoints("areas")` → 32 resultados

El bug es **parcialmente silencioso**: funciona cuando las palabras aparecen contiguas (con guión) en el path. Falla cuando las palabras están en campos distintos (summary vs path) o en orden diferente. Ejemplo: `"booking filter"` → 0 resultados, aunque hay endpoints de bookings con filtros.

**Fix:**
```typescript
const words = q.split(/\s+/).filter(Boolean);
if (words.every(w => searchable.includes(w))) { ... }
```

**3. `switchEnv` edge case silencioso**

Si `input.username`/`password` no se pasan Y `getPasswordForEnv()` retorna `undefined` (solo si `OPENAPI_TESTING_PASSWORD` y `OPENAPI_PASSWORD` no están definidas), se llama `setSpecUrl` pero no `setCredentials`. El cache se limpia pero el env podría usar credenciales anteriores. En producción no ocurre porque las env vars están definidas, pero es un path silencioso.

---

### 🟢 Bien diseñado

- **`bundle` ya implementado:** El cambio más impactante del primer audit ya está en `spec-loader.ts`. Ratio 1,4x (vs el máximo temido de 3x).
- **`lenientYamlParser` correctamente aplicado:** Resuelve el problema de YAML inválido (`errors504.yaml` con key duplicada) en todos los entornos.
- **Caché correcta:** `setSpecUrl`, `setCredentials` y `clearCache` invalidan `cachedSpec = null`. No hay path donde la spec se cargue con URL/credenciales incorrectas.
- **`listEndpoints` requiere filtro:** Sin filtro devuelve error — evita dumps de toda la API.
- **`listTags` muy compacto:** 344 tokens para 30 tags con descripción. Primer paso de navegación ideal.
- **`listEndpoints` con tag filter eficiente:** 567 tokens máximo (tag con 26 endpoints). Permite elegir endpoint antes de `getEndpoint`.
- **Tool definitions concisas:** 636 tokens en total (listTags: 35, listEndpoints: 97, searchEndpoints: 59, getEndpoint: 241, getSchema: 61, switchEnv: 144). Enviados una sola vez al iniciar el MCP.
- **Primera carga rápida:** ~1.2s con `bundle`. Lazy loading correcto.
- **`searchEndpoints` cubre path + summary + description + tags:** Buena cobertura para queries de una sola palabra.
- **stdio transport:** Sin overhead HTTP en el transport.

---

## Recomendaciones (ordenadas por impacto)

### ~~1. Post-procesar `getEndpoint` para filtrar error responses genéricos~~ ✅ IMPLEMENTADO

**Fix aplicado en `src/tools/get-endpoint.ts`:** El default ya no devuelve los schemas de responses. En su lugar devuelve un resumen compacto (`"description [use section='responses.200' for schema]"`). Para obtener el schema completo: `section='responses.200'`. Para omitir responses completamente: `compact=true`.

**Resultado real:** media 1.078 → 400 tokens (-63%). El peor endpoint (GET /gateways/{gateway_id}): 7.552 → 463 tokens (-94%).

### 2. Fix `searchEndpoints` multi-palabra (AND logic)
**Impacto:** Medio. Mejora usabilidad cuando el LLM busca por concepto compuesto.
**Riesgo:** Ninguno. Fix de 2 líneas en `src/tools/search-endpoints.ts`.

### 3. Parámetro `compact: true` en `getEndpoint`
**Impacto:** Medio. Para flujos donde solo se necesita el request schema (no las respuestas), reduciría el coste de los endpoints complejos de 7.500 a ~1.000 tokens.
**Riesgo:** Bajo. Parámetro opcional, backward-compatible.

### 4. Fix edge case `switchEnv` sin credenciales
**Impacto:** Bajo (no ocurre en producción).
**Riesgo:** Ninguno. Añadir `else { /* no credentials available, keep existing */ }` con un warning en el output.

---

## Respuestas a las preguntas del plan

**¿Debería cambiar `dereference` por `bundle`?**
**Ya está hecho.** El cambio fue implementado entre el primer audit y este. El ratio real es 1,4x (no el 3x temido), lo que confirma que el problema principal no era el `dereference` sino la riqueza inherente de los schemas de respuesta en endpoints como `/gateways/{gateway_id}`.

**¿Hay alguna tool que gaste demasiados tokens?**
**Sí: `getEndpoint` en 6+ endpoints específicos** (>3.000 tokens, máximo 7.552). Los demás tools son eficientes. La causa no es el diseño sino los schemas de respuesta documentados exhaustivamente en esos endpoints.
