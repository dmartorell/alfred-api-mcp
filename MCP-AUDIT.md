# alfred-api-mcp: Audit Report

**Fecha:** 2026-04-14
**Método:** Medición directa con datos reales — spec cargada via `SwaggerParser.bundle` + `lenientYamlParser` contra `services.alfredsmartdata.com`. Todos los tests del plan ejecutados.

---

## Resumen ejecutivo

**WARN** — El MCP está bien estructurado. La recomendación crítica del audit anterior (cambiar `dereference` por `bundle`) **ya fue implementada**. Sin embargo, `getEndpoint` sigue siendo costoso en endpoints complejos: media de **1.078 tokens**, máximo de **7.552 tokens** (`GET /gateways/{gateway_id}`). El bug de `searchEndpoints` multi-palabra está confirmado. El resto (caché, listTags, listEndpoints) funciona correctamente.

---

## Métricas clave (medidas reales)

| Métrica | Valor | Valoración |
|---------|-------|-----------|
| Spec size (`bundle`) | 469 KB (~120.100 tokens) | — |
| Spec size (`dereference`) | 648 KB (~165.849 tokens) | — |
| Ratio `dereference`/`bundle` | **1,4x** | ✅ OK (no hay explosión exponencial) |
| Primera carga spec | **4–5s** | ✅ Aceptable |
| Cache hit | **0ms** | ✅ OK |
| `listTags` output | **344 tokens** (1.377 chars, 30 tags) | ✅ OK |
| `listEndpoints` (tag máximo, 26 eps) | **567 tokens** | ✅ OK |
| `getEndpoint` media | **1.078 tokens** | 🟡 WARN |
| `getEndpoint` máximo | **7.552 tokens** (`GET /gateways/{gateway_id}`) | 🔴 CRÍTICO |
| `getEndpoint` >3.000 tokens | **6 endpoints** | 🔴 CRÍTICO |
| Tool definitions overhead | **481 tokens/llamada** | ✅ OK |

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

- `searchEndpoints("availability type")` → **0 resultados** ← BUG
- `searchEndpoints("availability")` → 4 resultados
- `searchEndpoints("type")` → 12 resultados

El bug está en `src/tools/search-endpoints.ts`. Funciona casualmente para queries donde las palabras aparecen juntas en el texto (p.ej. "common area" → 27 resultados porque los summaries contienen esa frase literal), pero falla cuando las palabras no son adyacentes.

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
- **Tool definitions concisas:** 481 tokens de overhead por invocación MCP (35+97+59+86+61+144).
- **Primera carga aceptable:** 4–5s con `bundle`. Lazy loading correcto.
- **`searchEndpoints` cubre path + summary + description + tags:** Buena cobertura para queries de una sola palabra.
- **stdio transport:** Sin overhead HTTP en el transport.

---

## Recomendaciones (ordenadas por impacto)

### 1. Post-procesar `getEndpoint` para filtrar error responses genéricos
**Impacto:** Alto. Los 6 endpoints >3.000 tokens incluyen 5–6 response schemas de error estándar completamente documentados. Filtrarlos puede reducir el output a la mitad.
**Riesgo:** Bajo. Se puede hacer con una función que detecte si el response schema es el genérico `{ errors: [{ detail: string }] }`.

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
