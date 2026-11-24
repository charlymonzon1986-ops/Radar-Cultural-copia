-- Aplicada el 2026-11-24 sobre el proyecto boeurmldeqvcaikdhtvy (Radar Cultural).
-- Evita duplicados de evento (mismo título, lugar y fecha) y que entre texto como fecha
-- (p. ej. "Por confirmar"). Antes de aplicarla se eliminaron 11 duplicados/pendientes sin fecha
-- (respaldo en supabase/backups/2026-11-24_limpieza_eventos.json).

CREATE UNIQUE INDEX IF NOT EXISTS eventos_unico_titulo_lugar_fecha
  ON public.eventos (lower(btrim(titulo)), lower(btrim(lugar)), COALESCE(fecha_evento, ''));

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_fecha_evento_formato
  CHECK (fecha_evento IS NULL OR fecha_evento ~ '^\d{4}-\d{2}-\d{2}$');

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_fecha_cierre_formato
  CHECK (fecha_cierre IS NULL OR fecha_cierre ~ '^\d{4}-\d{2}-\d{2}$');
