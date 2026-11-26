---
name: radar-cultural-db-maintenance
description: Mantenimiento de la base de Radar Cultural (proyecto Supabase boeurmldeqvcaikdhtvy). Usar para limpiar eventos vencidos, cargar eventos, corregir es_proximo, auditar duplicados o revisar el estado de la base. Esta skill reemplaza la versión anterior, que usaba un esquema que ya no existe.
---

# Radar Cultural: mantenimiento de la base de datos

## Dos listas de lugares distintas (leer primero)

- **Pines del mapa:** `src/data/espacios.ts` (repo `Radar-Cultural-copia`). Son ~170 lugares. Si un lugar no está ahí, su pin no aparece en el mapa.
- **Lugares válidos para eventos:** tabla `lugares` de Supabase (168 filas). Un evento solo se acepta si su `lugar` existe en esa tabla.

Antes de cargar un evento, verificar que el lugar esté en **las dos**.

## Esquema real (verificado 2026-11-26)

Tabla `eventos`:
- `titulo`, `lugar` (texto, NOT NULL). `lugar` debe coincidir con `lugares.nombre`.
- `fecha_evento`, `fecha_cierre`: **texto** `YYYY-MM-DD`, o `NULL`. Hay CHECK que rechaza cualquier otro formato.
- `tipo_fecha` (texto, CHECK): `fecha` | `periodo` | `permanente` | `sin_verificar`.
  - `fecha`: fecha puntual (46 eventos).
  - `periodo`: dura varios días o semanas, con `fecha_evento` y `fecha_cierre` (11 eventos).
  - `permanente`: exposición o colección permanente. Permitido, pero hoy no hay filas.
  - `sin_verificar`: la fecha no está confirmada (20 eventos, todos con `fecha_evento = '2026-01-01'`).
- `estado` (CHECK): `pendiente` | `aprobado` | `rechazado`. Default `pendiente`.
- `hora`, `precio`, `descripcion`, `fuente_url`, `entrada_url`, `imagen_url`, `instagram_url`, `es_proximo`, `fecha_inauguracion`, `tipo_evento`, `created_at`.
- Índice único sobre `(lower(btrim(titulo)), lower(btrim(lugar)), COALESCE(fecha_evento,''))`. Un insert duplicado falla.

Tabla `lugares`: `nombre` (único), `lat`, `lng`, `categoria` (`PUB`, `PRIV`, `CAFE`, `LIB`, `HIST`, `TEATRO`), `categoria_label`, `instagram`.

Tablas auxiliares: `acciones_pendientes`, `eventos_pendientes` (sin uso activo), `fuentes_eventos`, `fotos`. La tabla `job_applications` **no es de Radar Cultural**: no tocarla.

## Reglas críticas

1. **Nunca modificar `instagram_url`** en ninguna tabla.
2. **Eventos nuevos entran como `pendiente`** y solo pasan a `aprobado` con confirmación explícita de Juano.
3. **No cargar eventos genéricos** (ver `scripts/scraper/lib/genericos.js` y `REGLAS_CONTENIDO.md`).
4. **Fechas en `YYYY-MM-DD`** (o `NULL`, o `2026-01-01` para permanentes y sin verificar). Nunca "Por confirmar" ni `DD/MM/YYYY`.
5. **Antes de borrar:** `SELECT` previo, respaldo JSON en `supabase/backups/` del repo, confirmación explícita y `RETURNING` en el DELETE.
6. **Lugares:** solo insertar eventos para lugares que existan en `lugares` **y** en `espacios.ts`.
7. **El centinela `2026-01-01` no define el tipo.** Lo define `tipo_fecha`. Un evento con centinela y `tipo_fecha = 'sin_verificar'` no es permanente: su fecha es desconocida. No cambiar su `tipo_fecha` ni su `estado` sin que Juano confirme la fecha real.
8. **`es_proximo` solo para `tipo_fecha` en (`fecha`, `periodo`)** y con fecha dentro de los próximos 7 días.

## Diagnóstico inicial

```sql
SELECT tipo_fecha, estado, COUNT(*) FROM eventos GROUP BY 1, 2 ORDER BY 1, 2;

-- Aprobados ya vencidos (solo fecha y periodo)
SELECT id, titulo, lugar, tipo_fecha, fecha_evento, fecha_cierre
FROM eventos
WHERE estado = 'aprobado'
  AND tipo_fecha IN ('fecha', 'periodo')
  AND COALESCE(fecha_cierre, fecha_evento) < CURRENT_DATE::text
ORDER BY fecha_evento;

-- Pendientes sin fecha (no se pueden aprobar desde el bot)
SELECT id, titulo, lugar, fecha_cierre FROM eventos
WHERE estado = 'pendiente' AND fecha_evento IS NULL;
```

Mostrar el resultado a Juano y pedir confirmación antes de cualquier cambio.

## Vencimiento

- `tipo_fecha = 'fecha'`: vence cuando pasa `fecha_evento`.
- `tipo_fecha = 'periodo'`: vence cuando pasa `fecha_cierre`.
- `tipo_fecha = 'permanente'`: nunca vence.
- `tipo_fecha = 'sin_verificar'`: no vence por fecha. Revisar a mano con Juano.

## Limpieza de vencidos

```sql
-- Paso 1: respaldo (copiar el resultado a supabase/backups/ en el repo)
SELECT to_jsonb(e) FROM eventos e WHERE id IN (...);

-- Paso 2: borrado, solo con confirmación
DELETE FROM eventos WHERE id IN (...) RETURNING id, titulo, estado;
```

Si hay más de 20 eventos, el scraper aplica un circuit breaker y pide confirmación por Telegram. En manual: resumen primero, confirmación después.

## Insertar eventos

```sql
INSERT INTO eventos (titulo, lugar, fecha_evento, fecha_cierre, tipo_fecha, hora, precio, descripcion, fuente_url, entrada_url, tipo_evento, estado)
VALUES ('Título concreto', 'Nombre exacto en lugares', '2026-12-05', NULL, 'fecha', '20:00', NULL, NULL, 'https://...', NULL, 'musica', 'pendiente')
RETURNING id, titulo, estado;
```

Verificar antes: título concreto, `tipo_fecha` correcto (`fecha` o `periodo`; `permanente` solo para exposiciones permanentes; nunca `sin_verificar` salvo pedido explícito), fecha en `YYYY-MM-DD`, lugar en `lugares` y en `espacios.ts`, y `fuente_url` absoluta.

## Flag `es_proximo`

```sql
UPDATE eventos
SET es_proximo = (fecha_evento::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)
WHERE tipo_fecha IN ('fecha', 'periodo')
  AND fecha_evento ~ '^\d{4}-\d{2}-\d{2}$'
RETURNING id, titulo, es_proximo;
```

Mostrar las filas que cambian antes de ejecutar.

## Cierre de sesión

- [ ] Respaldo guardado en el repo para cualquier borrado
- [ ] Eventos nuevos en `pendiente` (salvo aprobación explícita)
- [ ] Ninguna `instagram_url` modificada
- [ ] Ningún evento genérico cargado
- [ ] `sin_verificar` sin cambios no autorizados
- [ ] Lugares existentes en `lugares` y en `espacios.ts`
- [ ] Conteo final por `tipo_fecha` y `estado`
