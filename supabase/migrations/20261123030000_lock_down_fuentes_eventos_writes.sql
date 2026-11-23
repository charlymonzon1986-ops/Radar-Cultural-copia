-- Cierra escrituras anónimas sobre fuentes_eventos.
-- Aplicada vía MCP el 2026-11-23. scrape-eventos usa SUPABASE_SERVICE_ROLE_KEY (bypasea RLS).

DROP POLICY IF EXISTS "Anyone can insert fuentes" ON public.fuentes_eventos;
DROP POLICY IF EXISTS "Anyone can update fuentes" ON public.fuentes_eventos;
