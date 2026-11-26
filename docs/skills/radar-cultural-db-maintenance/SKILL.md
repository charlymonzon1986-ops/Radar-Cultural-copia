---
name: radar-cultural-db-maintenance
description: Mantenimiento de la base de Radar Cultural (proyecto Supabase boeurmldeqvcaikdhtvy). Usar para limpiar eventos vencidos, cargar eventos, corregir es_proximo, auditar duplicados o revisar el estado de la base. Esta skill reemplaza la versión anterior, que usaba un esquema que ya no existe.
---

# Radar Cultural: mantenimiento de la base de datos

## Dos listas de lugares distintas (leer primero)

- **Pines del mapa:** `src/data/espacios.ts` (repo `Radar-Cultural-copia`). Son ~170 lugares. Si un lugar no está ahí, su pin no aparece en el mapa.
- **Lugares válidos para eventos:** tabla `lugares` de Supabase (168 filas). Un evento solo se acepta si su `lugar` existe en esa tabla.

Antes de cargar un evento, verificar que el lugar esté en **las dos**. Si falta en `espacios.ts`, el evento se guarda pero no se ve en el mapa. Si falta en `lugares`, el scraper lo descarta.

## Esquema real (verificado 2026-11-24)

Tabla `eventos`:
- `titulo`, `lugar` (texto, NOT NULL). `lugar` debe coincidir con `lugares.nombre`.
- `fecha_evento`, `fecha_cierre`: **texto** `YYYY-MM-DD`, o `NULL`. El valor centinela `2026-01-01` marca exposiciones y colecciones permanentes. Hay un CHECK que rechaza cualquier otro formato.
- `estado`: `pendiente` | `aprobado` | `rechazado`. Default `pendiente`.
- `hora`, `precio`, `descripcion`, `fuente_url`, `entrada_url`, `imagen_url`, `instagram_url`, `es_proximo`, `fecha_inauguracion`, `tipo_evento`.
- Índice único sobre `(lower(btrim(titulo)), lower(btrim(lugar)), COALESCE(fecha_evento,''))`. Un insert duplicado falla.

Tabla `lugares`: `nombre` (único), `lat`, `lng`, `categoria` (`PUB`, `PRIV`, `CAFE`, `LIB`, `HIST`, `TEATRO`), `categoria_label`, `instagram`.

Tablas auxiliares: `acciones_pendientes` (confirmaciones del bot de Telegram), `eventos_pendientes` (historial, sin uso activo), `fuentes_eventos`, `fotos`. La tabla `job_applications` **no es de Radar Cultural**: no tocarla.

## Reglas críticas

1. **Nunca modificar `instagram_url`** en ninguna tabla, aunque parezca incorrecto.
2. **Eventos nuevos entran como `pendiente`.** Solo se pasan a `aprobado` con confirmación explícita de Juano. Nunca insertar directo como `aprobado`.
3. **No cargar eventos genéricos.** Un título que solo describe una categoría o el nombre del lugar no se carga. La regla está en `scripts/scraper/lib/genericos.js` y en `REGLAS_CONTENIDO.md` del repo.
4. **Fechas siempre en formato `YYYY-MM-DD`** (o `NULL`, o `2026-01-01` para permanentes). Nunca texto como "Por confirmar" ni formato `DD/MM/YYYY`.
5. **Antes de borrar:** mostrar las filas con `SELECT`, guardar un respaldo (JSON en `supabase/backups/` del repo) y pedir confirmación explícita. Usar `RETURNING` en cada DELETE.
6. **Lugares:** solo insertar eventos para lugares que existan en `lugares` **y** en `espacios.ts`. Si falta alguno, avisar antes de hacer nada.

## Diagnóstico inicial

```sql
SELECT estado, COUNT(*) FROM eventos GROUP BY estado;

-- Aprobados ya vencidos (excluye permanentes)
SELECT id, titulo, lugar, fecha_evento, fecha_cierre
FROM eventos
WHERE estado = 'aprobado'
  AND fecha_evento <> '2026-01-01'
  AND COALESCE(fecha_cierre, fecha_evento) < CURRENT_DATE::text
ORDER BY fecha_evento;

-- Pendientes sin fecha (no se pueden aprobar desde el bot)
SELECT id, titulo, lugar, fecha_cierre FROM eventos
WHERE estado = 'pendiente' AND fecha_evento IS NULL;
```

Mostrar el resultado a Juano y pedir confirmación antes de cualquier cambio.

## Limpieza de vencidos

Los eventos con `fecha_evento = '2026-01-01'` nunca vencen. Los demás vencen cuando pasa `fecha_cierre` (o `fecha_evento` si no hay cierre).

```sql
-- Paso 1: respaldo (copiar el resultado a supabase/backups/ en el repo)
SELECT to_jsonb(e) FROM eventos e WHERE id IN (...);

-- Paso 2: borrado, solo con confirmación
DELETE FROM eventos WHERE id IN (...) RETURNING id, titulo, estado;
```

Si hay más de 20 eventos, el scraper aplica un circuit breaker y pide confirmación por Telegram. Hacer lo mismo en manual: resumen primero, confirmación después.

## Insertar eventos

```sql
INSERT INTO eventos (titulo, lugar, fecha_evento, fecha_cierre, hora, precio, descripcion, fuente_url, entrada_url, tipo_evento, estado)
VALUES ('Título concreto', 'Nombre exacto en lugares', '2026-12-05', NULL, '20:00', NULL, NULL, 'https://...', NULL, 'musica', 'pendiente')
RETURNING id, titulo, estado;
```

Verificar antes: el título es concreto (no genérico), la fecha es `YYYY-MM-DD`, el `lugar` existe en `lugares` y en `espacios.ts`, y `fuente_url` es absoluta.

## Flag `es_proximo`

Solo `true` para eventos de los próximos 7 días:

```sql
UPDATE eventos SET es_proximo = (fecha_evento::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)
WHERE fecha_evento ~ '^\d{4}-\d{2}-\d{2}$' AND fecha_evento <> '2026-01-01'
RETURNING id, titulo, es_proximo;
```

Mostrar las filas que cambian antes de ejecutar.

## Cierre de sesión

- [ ] Respaldo guardado en el repo para cualquier borrado
- [ ] Eventos nuevos en `pendiente` (salvo aprobación explícita)
- [ ] Ninguna `instagram_url` modificada
- [ ] Ningún evento genérico cargado
- [ ] Lugares existentes en `lugares` y en `espacios.ts`
- [ ] Conteo final por estado
