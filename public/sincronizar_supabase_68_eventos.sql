-- ============================================================
-- SCRIPT DE SINCRONIZACIÓN OFICIAL: RADAR CULTURAL (68 EVENTOS)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. Crear tabla si no existe y asegurar todas las columnas necesarias
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lugar TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_evento TEXT,
  hora TEXT,
  fuente_url TEXT,
  instagram_url TEXT,
  estado TEXT DEFAULT 'aprobado',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columnas si la tabla fue creada con un esquema diferente
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS lugar TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS fecha_evento TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS hora TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS fuente_url TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'aprobado';
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Quitar restricción NOT NULL de columnas previas si existieran
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='eventos' AND column_name='fecha_inicio') THEN
    ALTER TABLE public.eventos ALTER COLUMN fecha_inicio DROP NOT NULL;
  END IF;
END $$;

-- 2. Habilitar permisos de eliminación y escritura para que la web no se vuelva a bloquear
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a anon y auth" ON public.eventos;
CREATE POLICY "Permitir todo a anon y auth" ON public.eventos
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Eliminar eventos antiguos, duplicados o no validados (dejar en 0)
DELETE FROM public.eventos;

-- 4. Insertar los 68 eventos activos y verificados (id generado automáticamente por PostgreSQL UUID)
INSERT INTO public.eventos (lugar, titulo, descripcion, fecha_evento, hora, fuente_url, instagram_url, estado)
VALUES
  ('MALBA', 'Viva Frida: Exposición de Frida Kahlo', 'Exposición organizada por SAC (Semana de la Alta Costura) y el Museo Frida Kahlo de México, con curaduría de Circe Henestrosa. Reúne 365 objetos originales de la artista en su primera presentación en Sudamérica.', '2026-09-19', '19:00 hs (Gran Inauguración)', 'https://www.malba.org.ar', 'https://www.instagram.com/museomalba/', 'aprobado'),
  ('MALBA', 'Belkis Ayón – Mito y desobediencia', 'Exposición antológica de la gran grabadora cubana Belkis Ayón, explorando el mito de Sikán y el universo simbólico de la sociedad secreta Abakuá.', '2026-07-17', NULL, 'https://www.malba.org.ar', 'https://www.instagram.com/museomalba/', 'aprobado'),
  ('MALBA', 'Tercer Ojo — Colección Costantini en Malba', 'Más de 220 obras maestras del arte latinoamericano en diálogo con la Colección Malba: Frida Kahlo (''Diego y yo''), Tarsila do Amaral, Diego Rivera, Wifredo Lam y Antonio Berni.', '2026-01-01', NULL, 'https://www.malba.org.ar', 'https://www.instagram.com/museomalba/', 'aprobado'),
  ('MALBA', 'Colección Malba—Costantini: Latinoamérica en expansión', 'Exposición central en el marco del 25º aniversario del museo, recorriendo hitos y vanguardias del arte continental.', '2026-03-01', NULL, 'https://www.malba.org.ar', 'https://www.instagram.com/museomalba/', 'aprobado'),
  ('Museo Nacional de Bellas Artes', 'Adriana Bustos — 130º Aniversario del Bellas Artes', 'Obra especialmente comisionada y recorrido por la historia visual e institucional del Museo Nacional de Bellas Artes.', '2026-07-01', NULL, 'https://www.bellasartes.gob.ar', 'https://www.instagram.com/bellasartesargentina/', 'aprobado'),
  ('Museo Nacional de Bellas Artes', 'Obras Maestras de la Colección Permanente', 'Recorrido por el acervo público de arte más importante de Latinoamérica: Auguste Rodin, Edgar Degas, Édouard Manet, Claude Monet, Francisco de Goya y El Greco.', '2026-01-01', NULL, 'https://www.bellasartes.gob.ar', 'https://www.instagram.com/bellasartesargentina/', 'aprobado'),
  ('Museo Nacional de Bellas Artes', 'Grandes Maestros del Arte Argentino', 'Salas permanentes dedicadas al arte nacional: Antonio Berni, Lino Enea Spilimbergo, Xul Solar, Raquel Forner y Benito Quinquela Martín.', '2026-01-01', NULL, 'https://www.bellasartes.gob.ar', 'https://www.instagram.com/bellasartesargentina/', 'aprobado'),
  ('Museo de Arte Moderno', 'Bosques Umbral — Hábitat, Pensamiento y Tecnología', 'Exposición que piensa el bosque como forma de pensamiento, reuniendo obras de Gala Berger, Flavia Da Rin y Jimena Travaglio (Programa 70º Aniversario).', '2026-08-08', NULL, 'https://museomoderno.buenosaires.gob.ar', 'https://www.instagram.com/museomodernoba/', 'aprobado'),
  ('Museo de Arte Moderno', 'Luis Camnitzer: Todo por aprender. La resurrección de Simón Rodríguez', 'Gran muestra antológica dedicada al influyente artista conceptual latinoamericano Luis Camnitzer.', '2026-08-15', NULL, 'https://museomoderno.buenosaires.gob.ar', 'https://www.instagram.com/museomodernoba/', 'aprobado'),
  ('Museo de Arte Moderno', 'Moderno y MetaModerno: Edición 70 Aniversario', 'Exposición central que recorre las piezas maestras de la colección del Moderno desde las vanguardias de los años 40 hasta el presente.', '2026-04-15', NULL, 'https://museomoderno.buenosaires.gob.ar', 'https://www.instagram.com/museomodernoba/', 'aprobado'),
  ('Fundación Proa', 'Thomas Demand: El tartamudeo de la historia', 'Primera gran retrospectiva en Argentina del célebre artista alemán Thomas Demand, curada por Douglas Fogle, con más de 60 obras en gran formato.', '2026-08-22', NULL, 'https://proa.org', 'https://www.instagram.com/fundacion_proa/', 'aprobado'),
  ('Fundación Proa', 'PROA21: Melisa Zulberti — Protocolos para un comportamiento colectivo', 'Residencia y laboratorio escénico abierto que investiga la interconexión entre cuerpo, luz, sonido y espacio.', '2026-08-15', NULL, 'https://proa.org', 'https://www.instagram.com/fundacion_proa/', 'aprobado'),
  ('Teatro Colón', 'La ópera de tres centavos — Kurt Weill / Bertolt Brecht', 'Temporada oficial en el Teatro Colón de la célebre obra teatral-musical de Kurt Weill y Bertolt Brecht con funciones finales hasta el 13 de septiembre.', '2026-08-21', '20:00 hs', 'https://www.teatrocolon.org.ar', 'https://www.instagram.com/teatrocolon/', 'aprobado'),
  ('Teatro Colón', 'Ballet Estable: El Lago de los Cisnes', 'La legendaria obra de Chaikovski interpretada por el Ballet Estable del Teatro Colón con coreografía de Raúl Candal y dirección orquestal.', '2026-09-02', '20:00 hs', 'https://www.teatrocolon.org.ar', 'https://www.instagram.com/teatrocolon/', 'aprobado'),
  ('Teatro Colón', 'Lobgesang (Mendelssohn) – Orquesta Académica del Teatro Colón', 'Sinfonía-Cantata de Felix Mendelssohn interpretada por la Orquesta Académica en la Sala Principal.', '2026-09-05', '17:00 hs', 'https://www.teatrocolon.org.ar', 'https://www.instagram.com/teatrocolon/', 'aprobado'),
  ('Teatro Colón', 'FIBA 2026 — Festival Internacional de Buenos Aires', 'El gran festival de artes escénicas de Buenos Aires con sede central en el Teatro Colón y salas del CTBA. Funciones destacadas como ''Principio de éxtasis'' de Goyo Montero y coproducciones internacionales.', '2026-09-09', 'Funciones diarias', 'https://festivalesba.org', 'https://www.instagram.com/festivalesba/', 'aprobado'),
  ('Centro Cultural Recoleta', 'Federico Klemm: Iluminador de mitos', 'Muestra antológica con más de noventa piezas en coproducción con la Fundación Klemm, explorando su faceta de artista, mecenas y performer.', '2026-04-15', NULL, 'https://centroculturalrecoleta.org', 'https://www.instagram.com/elrecoleta/', 'aprobado'),
  ('Centro Cultural Recoleta', 'Convocatoria Federal de Artes Visuales', 'Exposiciones contemporáneas de Andrés Aizicovich, Manuel Sigüenza y Flor Alvarado en salas del Recoleta.', '2026-07-01', NULL, 'https://centroculturalrecoleta.org', 'https://www.instagram.com/elrecoleta/', 'aprobado'),
  ('Palacio Libertad (CCK)', 'Homenaje a Jorge Luis Borges: 40 Años — Intervenciones Visuales', 'Instalaciones interactivas, ciclo de cine y salas dedicadas a la obra y pensamiento de Jorge Luis Borges.', '2026-05-15', NULL, 'https://palaciolibertad.gob.ar', 'https://www.instagram.com/libertadpalacio/', 'aprobado'),
  ('Palacio Libertad (CCK)', 'Temporada Sinfónica — Conciertos en La Ballena Azul', 'Conciertos de la Orquesta Sinfónica Nacional, Coro Polifónico y solistas invitados en el Auditorio Nacional.', '2026-08-01', '20:00 hs', 'https://palaciolibertad.gob.ar', 'https://www.instagram.com/libertadpalacio/', 'aprobado'),
  ('Palacio Libertad (CCK)', 'Piso de Niñez & Espacio Mafalda — Homenaje a Quino', 'Salas lúdicas permanentes con ilustraciones, activaciones participativas y el universo de Quino y Mafalda.', '2026-01-01', NULL, 'https://palaciolibertad.gob.ar', 'https://www.instagram.com/libertadpalacio/', 'aprobado'),
  ('Usina del Arte', 'Luces de la Boca — Experiencia Sensorial & Arte Lumínico', 'Instalación inmersiva de iluminación y diseño sonoro que homenajea la identidad industrial y cultural del barrio de La Boca.', '2026-06-01', NULL, 'https://buenosaires.gob.ar/usinadelarte', 'https://www.instagram.com/usinadelarte/', 'aprobado'),
  ('Usina del Arte', 'Ciclo de Conciertos Acústicos & Música de Cámara', 'Presentaciones en vivo en la Sala Sinfónica y Auditorio con ensambles de cámara, tango y jazz.', '2026-08-01', NULL, 'https://buenosaires.gob.ar/usinadelarte', 'https://www.instagram.com/usinadelarte/', 'aprobado'),
  ('Colección Fortabat', 'Colección Permanente de Arte Argentino e Internacional', 'Obras destacadas de Xul Solar, Antonio Berni, J.M.W. Turner, Marc Chagall y Pieter Brueghel el Joven.', '2026-01-01', NULL, 'https://www.coleccionfortabat.org.ar', 'https://www.instagram.com/coleccionfortabat/', 'aprobado'),
  ('Colección Fortabat', 'Retratos Porteños — Fotografía y Paisaje', 'Selección de fotografías históricas y contemporáneas sobre el río, el puerto y la evolución urbana de Buenos Aires.', '2026-06-05', NULL, 'https://www.coleccionfortabat.org.ar', 'https://www.instagram.com/coleccionfortabat/', 'aprobado'),
  ('Centro Cultural Borges', 'Sara Facio — Fotografía y Memoria Cultural', 'Muestra homenaje a la emblemática fotógrafa argentina con retratos célebres de grandes escritores y figuras de la cultura.', '2026-06-10', NULL, 'https://centroculturalborges.gob.ar', 'https://www.instagram.com/centroborges/', 'aprobado'),
  ('Centro Cultural Borges', 'Tangos de Buenos Aires — Música y Danza en Vivo', 'Ciclo de danza contemporánea y música de cámara con arreglos modernos sobre clásicos del tango en el Auditorio Piazzolla.', '2026-08-05', NULL, 'https://centroculturalborges.gob.ar', 'https://www.instagram.com/centroborges/', 'aprobado'),
  ('Centro Cultural San Martín', 'Ciclo de Cine de Autor & Muestras Audiovisuales', 'Selección de cine independiente nacional, retrospectivas de directores y debates en las salas subterráneas.', '2026-08-01', NULL, 'https://elculturalmartin.buenosaires.gob.ar', 'https://www.instagram.com/elculturalmartin/', 'aprobado'),
  ('Centro Cultural San Martín', 'Videoarte y Nuevos Medios en la Plaza Seca', 'Proyecciones multimedia y arte sonoro experimental al aire libre.', '2026-07-15', NULL, 'https://elculturalmartin.buenosaires.gob.ar', 'https://www.instagram.com/elculturalmartin/', 'aprobado'),
  ('Teatro Nacional Cervantes', 'Temporada Oficial de Artes Escénicas — Sala María Guerrero', 'Producciones de teatro clásico y contemporáneo argentino con destacados elencos nacionales.', '2026-08-01', '20:00 hs', 'https://www.teatrocervantes.gob.ar', 'https://www.instagram.com/cervantestnc/', 'aprobado'),
  ('Ciudad Cultural Konex', 'La Bomba de Tiempo — Percusión en Vivo', 'Ritmo y energía colectiva con dirección por señas al aire libre.', '2026-08-03', '19:00 hs', 'https://www.cckonex.org', 'https://www.instagram.com/cckonex/', 'aprobado'),
  ('Ciudad Cultural Konex', 'Teatro Ciego — Experiencia Inmersiva', 'Un viaje de percepción sensorial sin estímulos visuales, guiado por sonido holofónico en vivo.', '2026-08-01', '21:00 hs', 'https://www.cckonex.org', 'https://www.instagram.com/cckonex/', 'aprobado'),
  ('Artlab', 'Artlab Live — Música Electrónica & Visuales 360°', 'Sesiones en vivo de productores de música electrónica experimental acompañados de proyecciones envolventes.', '2026-08-07', '22:00 hs', 'https://artlabpro.net', 'https://www.instagram.com/artlabpro/', 'aprobado'),
  ('Planetario Galileo Galilei', 'Show Inmersivo 360°: Luces del Universo', 'Proyección domo completa explorando galaxias lejanas, nebulosas y descubrimientos astronómicos.', '2026-01-01', '14:00 a 19:00 hs', 'https://planetario.buenosaires.gob.ar', 'https://www.instagram.com/planetarioba/', 'aprobado'),
  ('Museo de Arte Contemporáneo (MACBA)', 'Geometría Sensorial — Muestra Óptica y Cinetismo', 'Muestra colectiva de abstracción geométrica y arte óptico argentino e internacional en San Telmo.', '2026-08-14', NULL, 'https://museomacba.org', 'https://www.instagram.com/radarcultural_/', 'aprobado'),
  ('Museo Histórico Nacional', 'Pasión de Multitudes: Historia del Fútbol Argentino', 'Exposición sobre la historia del fútbol en el país: camisetas históricas, trofeos y memorabilia de leyendas.', '2026-07-01', NULL, 'https://museohistoriconacional.cultura.gob.ar', 'https://www.instagram.com/mhnargentina/', 'aprobado'),
  ('Museo Histórico Nacional', 'Tiempo de Revolución: El Cabildo, Mayo y los Símbolos Patrios', 'Objetos originales de San Martín, Belgrano y los próceres de la independencia en el Parque Lezama.', '2026-01-01', NULL, 'https://museohistoriconacional.cultura.gob.ar', 'https://www.instagram.com/mhnargentina/', 'aprobado'),
  ('Museo del Cabildo', 'Mayo de 1810 y el Virreinato del Río de la Plata', 'Recorrido histórico por el edificio fundacional de la Patria con pinturas, documentos y arqueología urbana.', '2026-01-01', NULL, 'https://cabildonacional.cultura.gob.ar', 'https://www.instagram.com/cabildonacional/', 'aprobado'),
  ('Buenos Aires Museo (BAM)', 'Por la Calle del Medio: Historia y Transformación Porteña', 'Recorrido interactivo y multimedia sobre la evolución social, arquitectónica y cultural de Buenos Aires.', '2026-06-01', NULL, 'https://buenosaires.gob.ar/museos/bam', 'https://www.instagram.com/patrimonioba/', 'aprobado'),
  ('Museo Xul Solar', 'Panlingua y Visiones Cósmicas: Colección Permanente Xul Solar', 'Pinturas, cartas de tarot astronómico y el panajedrez creados por el genio visionario y amigo de Borges.', '2026-01-01', NULL, 'http://www.xulsolar.org.ar', 'https://www.instagram.com/museoxulsolar/', 'aprobado'),
  ('Museo de la Inmigración', 'Para todos los hombres del mundo: Memorias de la Inmigración', 'Exposición en el histórico Hotel de Inmigrantes sobre los contingentes que forjaron la identidad multicultural argentina.', '2026-01-01', NULL, 'http://untref.edu.ar/muntref', 'https://www.instagram.com/muntref/', 'aprobado'),
  ('Museo Benito Quinquela Martín', 'Color y Fuego en La Boca: Grandes Aguafuertes y Óleos de Quinquela', 'La mayor colección de obras del pintor de La Boca, sus mascarones de proa y la terraza de esculturas.', '2026-01-01', NULL, 'https://buenosaires.gob.ar/museoquinquelamartin', 'https://www.instagram.com/museoquinquelamartin/', 'aprobado'),
  ('Museo de la Cárcova', 'Calcos Escultóricos de Maestros Universales & Arte Contemporáneo', 'Calcos de yeso de obras maestras de la escultura clásica grecorromana y renacentista frente a la Reserva Ecológica.', '2026-03-01', NULL, 'https://museodelacarcova.una.edu.ar', 'https://www.instagram.com/museodelacarcovaoficial/', 'aprobado'),
  ('Museo Casa Carlos Gardel', 'Gardel y el Abasto: Mito, Voz y Arrabal', 'Recorrido por la casa que habitó el Zorzal Criollo con partituras, discos originales y grabaciones de época.', '2026-01-01', NULL, 'https://buenosaires.gob.ar/museos/museo-casa-carlos-gardel', 'https://www.instagram.com/museocasacarlosgardel/', 'aprobado'),
  ('Museo Judío de Buenos Aires', 'Patrimonio, Memoria e Identidad Judía en la Argentina', 'Muestra histórica de inmigración, cultura y tradiciones junto a la Gran Sinagoga de la calle Libertad.', '2026-01-01', NULL, 'https://museojudio.org.ar', 'https://www.instagram.com/museojudioba/', 'aprobado'),
  ('Museo de la Shoá', 'Memoria y Testimonio: Muestra Permanente del Holocausto', 'Espacio de reflexión pedagógica y memoria histórica con testimonios audiovisuales de sobrevivientes.', '2026-01-01', NULL, 'https://museodelashoa.org.ar', 'https://www.instagram.com/museoshoba/', 'aprobado'),
  ('Fundación Santander', 'Pabellón de las Artes — Instalaciones de Gran Escala', 'Exposiciones de arte contemporáneo, tecnología interactiva y proyectos comisionados en San Telmo.', '2026-08-01', NULL, 'https://fundacionsantander.com.ar', 'https://www.instagram.com/fundacion_santander_ar/', 'aprobado'),
  ('Fundación OSDE', 'Espacio de Arte: Muestras Visuales & Colecciones', 'Curadurías de fotografía contemporánea, dibujo y pintura argentina en el centro porteño.', '2026-08-10', NULL, 'https://fundacionosde.com.ar', 'https://www.instagram.com/espaciodearteosde/', 'aprobado'),
  ('MUNTREF', 'Laboratorio de Cruces entre Arte Contemporáneo y Sociedad', 'Proyectos curatoriales interdisciplinarios y residencias de artistas internacionales.', '2026-08-01', NULL, 'http://untref.edu.ar/muntref', 'https://www.instagram.com/muntref/', 'aprobado'),
  ('Teatro Presidente Alvear', 'La Visita de la Vieja Dama — Complejo Teatral BA', 'Gran producción dramática en la emblemática sala renovada de la Avenida Corrientes.', '2026-08-15', '20:00 hs', 'https://complejoteatral.gob.ar', 'https://www.instagram.com/complejoteatralba/', 'aprobado'),
  ('Bebop Club', 'Noches de Jazz & Blues: Quinteto Porteño', 'Conciertos de jazz en vivo en Palermo con los solistas más destacados de la escena nacional.', '2026-08-14', '21:30 hs', 'https://bebopclub.com.ar', 'https://www.instagram.com/bebopclub/', 'aprobado'),
  ('El Ateneo Grand Splendid', 'Ciclo de Lecturas & Encuentros de Autores', 'Presentaciones de libros, charlas con escritores e intervenciones musicales en el escenario del histórico teatro-librería.', '2026-08-12', NULL, 'https://www.yenny-elateneo.com', 'https://www.instagram.com/yenny_elateneo/', 'aprobado'),
  ('Timbre 4', 'Festival de Teatro Independiente & Voces Contemporáneas', 'Maratón de obras de dramaturgia propia y dirección emergente en Boedo.', '2026-08-14', '21:00 hs', 'https://www.timbre4.com', 'https://www.instagram.com/teatrotimbre4/', 'aprobado'),
  ('Museo Eduardo Sívori', 'Escultura Argentina en el Parque del Rosedal', 'Exposición al aire libre y en salas principales del museo destacando el arte figurativo y abstracto nacional.', '2026-08-15', NULL, 'https://buenosaires.gob.ar/museosivori', 'https://www.instagram.com/museosivori/', 'aprobado'),
  ('Museo Evita', 'Evita: Pasión y Liderazgo — Fotografía e Historia', 'Muestra fotográfica y testimonial sobre la vida, obra y legado social de Eva Perón en su museo de Palermo.', '2026-08-15', NULL, 'http://www.museoevita.org.ar', 'https://www.instagram.com/museoevita/', 'aprobado'),
  ('Museo Nacional de Arte Decorativo', 'Esplendor de la Belle Époque en el Palacio Errázuriz', 'Exposición de artes decorativas, mobiliario de época y arquitectura del Palacio Errázuriz Alvear.', '2026-08-18', NULL, 'https://museodecorativo.cultura.gob.ar', 'https://www.instagram.com/arte_decorativo/', 'aprobado'),
  ('Confitería La Ideal', 'Noches de Tango & Milonga en el Salón Dorado', 'Orquesta en vivo, exhibición de bailarines y gastronomía tradicional en la emblemática confitería histórica.', '2026-08-14', '20:30 hs', 'https://confiterialaideal.com.ar', 'https://www.instagram.com/confiterialaideal/', 'aprobado'),
  ('Fundación Andreani', 'Premio Andreani de Arte, Ciencia y Tecnología', 'Exposición de obras ganadoras e instalaciones interactivas que exploran la intersección entre tecnología, robótica, ciencia y artes visuales en La Boca.', '2026-09-10', NULL, 'https://fundacionandreani.org.ar', 'https://www.instagram.com/fundacionandreani/', 'aprobado'),
  ('Museo Enrique Larreta', 'Escultura Española y Arte en los Jardines Andaluces', 'Muestra de imaginería de los siglos XVI y XVII en el marco del pintoresco jardín hispano-musulmán de Belgrano.', '2026-08-15', NULL, 'https://buenosaires.gob.ar/museolarreta', 'https://www.instagram.com/museolarreta/', 'aprobado'),
  ('Café Tortoni', 'Noches de Tango & Show en la Bodega del Tortoni', 'Espectáculo tradicional de tango, baile y cuarteto en la emblemática bodega subterránea de 1858.', '2026-08-15', '20:00 hs', 'http://www.cafetortoni.com.ar', 'https://www.instagram.com/cafetortoni/', 'aprobado'),
  ('Los 36 Billares', 'Milonga Tradicional & Noches de Tango en Avenida de Mayo', 'Música en vivo en el subsuelo de billares centenarios, parejas de baile y gastronomía porteña.', '2026-08-15', '21:00 hs', 'https://www.los36billares.com.ar', 'https://www.instagram.com/los36billares/', 'aprobado'),
  ('Palacio Barolo', 'Visitas Guiadas Nocturnas & Faro Iluminado de la Ciudad', 'Recorrido por la arquitectura dantesca del Infierno, Purgatorio y Paraíso con vistas 360° desde la cúpula.', '2026-08-15', '19:00 y 20:30 hs', 'https://palaciobarolo.com.ar', 'https://www.instagram.com/palaciobarolotours/', 'aprobado'),
  ('Confitería del Molino', 'Recorridos Patrimoniales por el Edificio Histórico Restaurado', 'Visita guiada por los salones de fiesta, vitrales y cúpula art nouveau frente al Congreso de la Nación.', '2026-08-15', NULL, 'https://edificiodelmolino.gob.ar', 'https://www.instagram.com/delmolinook/', 'aprobado'),
  ('Cementerio de la Recoleta', 'Visitas Guiadas por el Patrimonio Escultórico y Monumentos Históricos', 'Recorridos históricos por los mausoleos de grandes próceres, artistas y arquitecturas neoclásicas y art decó.', '2026-01-01', NULL, 'https://buenosaires.gob.ar/cementerio-de-la-recoleta', 'https://www.instagram.com/patrimonioba/', 'aprobado'),
  ('Biblioteca Nacional', 'Muestras Bibliográficas & Salas de Exposición Jorge Luis Borges', 'Manuscritos originales, primeras ediciones y archivo fotográfico de las letras argentinas.', '2026-06-01', NULL, 'https://www.bn.gov.ar', 'https://www.instagram.com/bnmmargentina/', 'aprobado'),
  ('Teatro Avenida', 'Opera Festival Buenos Aires (OFEBA)', 'Festival de ópera clásica con obras del repertorio internacional (La Bohème, Don Giovanni, La Traviata, Rigoletto, Madama Butterfly).', '2026-09-05', 'Funciones confirmadas: 5, 11 y 19 de septiembre a las 20:00 hs', 'https://operafestivalbuenosaires.com.ar', 'https://www.instagram.com/teatroavenida/', 'aprobado'),
  ('Movistar Arena', 'Arena de conciertos - Programación variable', 'Espacio de recitales y grandes espectáculos en Villa Crespo. Consultar cartelera oficial y venta de entradas por show confirmado.', '2026-09-05', NULL, 'https://movistararena.com.ar', 'https://www.instagram.com/movistararenaar/', 'aprobado'),
  ('Palacio de Aguas Corrientes', 'Museo del Agua - Visitas Guiadas al Palacio de Aguas Corrientes', 'Museo permanente del patrimonio y la historia sanitaria de Buenos Aires en el histórico palacio de 1894. Visitas guiadas en turnos matutinos y vespertinos.', '2026-09-01', 'Lunes a viernes de 9:00 a 13:00 y 14:00 a 17:00 hs', 'https://www.aysa.com.ar/museo_del_agua', 'https://www.instagram.com/aysa.oficial/', 'aprobado');

-- Comprobar total: debe dar 68
SELECT COUNT(*) AS total_eventos_activos FROM public.eventos WHERE estado = 'aprobado';
