
-- Tabla de fuentes para scrapear (URLs de webs/Instagram de cada lugar)
CREATE TABLE public.fuentes_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lugar TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'web' CHECK (tipo IN ('web', 'instagram')),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de eventos extraídos
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lugar TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_evento TEXT,
  hora TEXT,
  fuente_url TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: lectura pública de eventos aprobados
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved events" ON public.eventos FOR SELECT USING (estado = 'aprobado');
CREATE POLICY "Anyone can view all events for admin" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Edge functions can insert events" ON public.eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Edge functions can update events" ON public.eventos FOR UPDATE USING (true) WITH CHECK (true);

-- RLS: fuentes_eventos lectura pública
ALTER TABLE public.fuentes_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view fuentes" ON public.fuentes_eventos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fuentes" ON public.fuentes_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fuentes" ON public.fuentes_eventos FOR UPDATE USING (true) WITH CHECK (true);
