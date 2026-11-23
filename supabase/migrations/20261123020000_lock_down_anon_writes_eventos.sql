-- Cierra escrituras anónimas sobre eventos y endurece funciones/vistas.
-- Aplicada vía MCP el 2026-11-23. Las escrituras de scraper, bot y edge functions
-- usan SUPABASE_SERVICE_ROLE_KEY, que bypasea RLS, así que no se ven afectadas.

DROP POLICY IF EXISTS "Permitir todo a anon y auth" ON public.eventos;
DROP POLICY IF EXISTS "Edge functions can insert events" ON public.eventos;
DROP POLICY IF EXISTS "Edge functions can update events" ON public.eventos;
DROP POLICY IF EXISTS "Anyone can view all events for admin" ON public.eventos;
DROP POLICY IF EXISTS "Service role full access" ON public.eventos_pendientes;

REVOKE EXECUTE ON FUNCTION public.notify_photo_upload() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.notify_photo_upload() SET search_path = public, pg_temp;
ALTER VIEW public.eventos_ordenados_popup SET (security_invoker = true);
