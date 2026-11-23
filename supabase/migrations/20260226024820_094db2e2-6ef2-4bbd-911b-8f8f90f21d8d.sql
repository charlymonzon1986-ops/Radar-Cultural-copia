-- Create table for photos
CREATE TABLE public.fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lugar TEXT NOT NULL,
  autor TEXT DEFAULT 'Anónimo',
  instagram TEXT DEFAULT '',
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (anonymous photo uploads)
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

-- Everyone can view photos
CREATE POLICY "Anyone can view photos" ON public.fotos
  FOR SELECT USING (true);

-- Anyone can insert photos
CREATE POLICY "Anyone can insert photos" ON public.fotos
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true);

-- Public read access
CREATE POLICY "Public read access for fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos');

-- Public upload access (anonymous users can upload)
CREATE POLICY "Public upload access for fotos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos');
