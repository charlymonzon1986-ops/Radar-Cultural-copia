-- Aplicada en Supabase (proyecto boeurmldeqvcaikdhtvy) el 2026-11-25
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS tipo_fecha text DEFAULT 'fecha';
ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_tipo_fecha_check;
ALTER TABLE public.eventos ADD CONSTRAINT eventos_tipo_fecha_check
  CHECK (tipo_fecha IN ('fecha', 'periodo', 'permanente', 'sin_verificar'));
UPDATE public.eventos SET tipo_fecha = CASE
  WHEN fecha_evento = '2026-01-01' AND fecha_cierre IS NULL THEN 'sin_verificar'
  WHEN fecha_evento = '2026-01-01' THEN 'periodo'
  WHEN fecha_cierre IS NOT NULL AND fecha_cierre <> fecha_evento THEN 'periodo'
  ELSE 'fecha'
END;
CREATE OR REPLACE VIEW public.eventos_visibles
WITH (security_invoker = true) AS
SELECT * FROM public.eventos
WHERE estado = 'aprobado'
  AND (
    tipo_fecha = 'permanente'
    OR (
      tipo_fecha IN ('fecha', 'periodo')
      AND coalesce(fecha_cierre, fecha_evento) >= to_char((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date, 'YYYY-MM-DD')
    )
  );
