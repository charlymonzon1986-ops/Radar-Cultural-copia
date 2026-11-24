# Reglas de contenido de Radar Cultural

Estas reglas son obligatorias. Están implementadas en el código; si cambiás algo, mantenelas.

## 1. No figuran eventos genéricos

Un evento tiene que ser **concreto**: un título que identifique una función, muestra, charla o show específico.

No se cargan títulos que describan solo una categoría, un formato o el propio lugar. Por ejemplo:

- "Colección Permanente", "Exposiciones", "Exhibiciones actuales", "Agenda", "Cartelera"
- "Taller", "Charla", "Visitas guiadas", "Show", "Concierto" (sin nombre propio)
- El nombre del propio venue como título (ej. "Teatro Colón")

**Dónde se aplica:** `scripts/scraper/lib/genericos.js` es la única lista. La usan `validator.js` (fuentes privadas) y `sources/gcba.js` (datos abiertos). Para cambiar la regla, tocá solo ese archivo.

**Si un evento genuino queda mal clasificado** como genérico, lo correcto es ajustar la lista de `genericos.js` y no cargarlo a mano.

## 2. Un solo scraper

El scraper oficial es `scripts/scraper/` y corre desde GitHub Actions (`scraper.yml`). No se agregan scrapers en otros lugares (Edge Functions, scripts sueltos, el frontend) sin discutirlo antes.

## 3. Eventos nuevos entran pendientes

Todo evento nuevo entra con `estado = 'pendiente'`. Solo pasa a `aprobado` cuando una persona lo aprueba desde el bot de Telegram.

## 4. Fechas válidas

`fecha_evento` es `YYYY-MM-DD`, o el valor centinela `2026-01-01` para exposiciones y colecciones permanentes. Nunca se guarda texto como "Por confirmar".

## 5. Columnas de Instagram

Ninguna actualización de eventos toca las columnas de Instagram. Solo se modifican datos del evento.

## 6. Borrado con confirmación

Si una corrida encuentra más de 20 eventos vencidos, no borra nada: pide confirmación por Telegram con botones.

## 7. Fuentes verificables

Todo evento tiene `fuente_url` absoluta, y esa URL tiene que responder (404, 410 o 5xx lo rechazan).
