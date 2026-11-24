-- Migración base de Radar Cultural (proyecto boeurmldeqvcaikdhtvy).
-- Refleja el esquema ACTUAL de producción, generado a partir de list_tables (verbose).
-- Es documentación y punto de partida: NO se ejecuta sobre la base existente.
-- Todas las sentencias son idempotentes (IF NOT EXISTS / DROP POLICY IF EXISTS) por si se aplica en una base nueva.

-- ---------- lugares (venues del mapa) ----------
create table if not exists public.lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  lat numeric,
  lng numeric,
  categoria text check (categoria in ('PUB', 'PRIV', 'CAFE', 'LIB', 'HIST', 'TEATRO')),
  categoria_label text,
  instagram text,
  created_at timestamptz default now()
);

-- ---------- eventos ----------
-- Nota: fecha_evento y fecha_cierre son text (YYYY-MM-DD o el centinela '2026-01-01').
-- Pendiente: CHECK de formato de fecha (ver REGLAS_CONTENIDO.md, regla 4).
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  lugar text not null,
  titulo text not null,
  descripcion text,
  fecha_evento text,
  hora text,
  fuente_url text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  instagram_url text,
  imagen_url text,
  created_at timestamptz default now(),
  es_proximo boolean default false,
  fecha_inauguracion text,
  precio text,
  tipo_evento text default 'exposicion',
  entrada_url text,
  fecha_cierre text
);

-- ---------- fuentes_eventos (URLs que alimentan el scraper / panel) ----------
create table if not exists public.fuentes_eventos (
  id uuid primary key default gen_random_uuid(),
  lugar text not null,
  url text not null,
  tipo text not null default 'web' check (tipo in ('web', 'instagram')),
  activa boolean not null default true,
  created_at timestamptz default now()
);

-- ---------- fotos (galería colaborativa) ----------
create table if not exists public.fotos (
  id uuid primary key default gen_random_uuid(),
  lugar text not null,
  autor text default 'Anónimo',
  instagram text default '',
  url text not null,
  created_at timestamptz default now()
);

-- ---------- acciones_pendientes (confirmaciones del bot de Telegram) ----------
create table if not exists public.acciones_pendientes (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  tipo text not null,
  payload jsonb not null default '{}'::jsonb,
  estado text not null default 'pendiente',
  creada_en timestamptz default now()
);

-- ---------- eventos_pendientes (historial de cambios propuestos) ----------
create table if not exists public.eventos_pendientes (
  id uuid primary key default gen_random_uuid(),
  accion text not null check (accion in ('agregar', 'actualizar', 'eliminar')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  evento_id uuid references public.eventos(id),
  lugar text not null,
  titulo text not null,
  descripcion text,
  fecha_evento text,
  hora text,
  fuente_url text,
  instagram_url text,
  imagen_url text,
  es_proximo boolean default false,
  fecha_inauguracion text,
  precio text,
  tipo_evento text default 'exposicion',
  entrada_url text,
  fecha_cierre text,
  campo_modificado text,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamptz default now()
);

-- ---------- job_applications (NO es de Radar Cultural: proyecto job-bot, compartido en esta base) ----------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  empresa text not null,
  descripcion text,
  url text not null,
  fecha_publicacion timestamptz,
  cv_usado text default 'admin',
  estado text default 'pendiente' check (estado in ('pendiente', 'aplicado', 'error', 'duplicado')),
  fecha_aplicacion timestamptz,
  nota_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- RLS ----------
alter table public.lugares enable row level security;
alter table public.eventos enable row level security;
alter table public.fuentes_eventos enable row level security;
alter table public.fotos enable row level security;
alter table public.acciones_pendientes enable row level security;
alter table public.eventos_pendientes enable row level security;
alter table public.job_applications enable row level security;

drop policy if exists "lugares_public_read" on public.lugares;
create policy "lugares_public_read" on public.lugares for select to public using (true);

drop policy if exists "Anyone can view approved events" on public.eventos;
create policy "Anyone can view approved events" on public.eventos for select to public using (estado = 'aprobado');

drop policy if exists "Anyone can view fuentes" on public.fuentes_eventos;
create policy "Anyone can view fuentes" on public.fuentes_eventos for select to public using (true);

drop policy if exists "Anyone can view photos" on public.fotos;
create policy "Anyone can view photos" on public.fotos for select to public using (true);

-- ⚠️ Riesgo conocido: cualquiera puede insertar fotos sin restricción. Revisar (ver auditoría).
drop policy if exists "Anyone can insert photos" on public.fotos;
create policy "Anyone can insert photos" on public.fotos for insert to public with check (true);

-- Sin políticas para acciones_pendientes, eventos_pendientes y job_applications:
-- solo accede la service role (bot, scraper). Así debe ser.
