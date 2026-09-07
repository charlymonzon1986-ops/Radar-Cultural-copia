import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgendaEvent {
  id: string;
  titulo: string;
  lugar: string;
  tipo?: string;
  fecha: string;
  fechaFormatted: string;
  isToday?: boolean;
  precioTipo: "gratis" | "con_entrada";
  precioTexto?: string;
  iconEmoji: string;
  fuenteUrl?: string;
  instagramUrl?: string;
}

interface CategoryFilter {
  id: string;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryFilter[] = [
  { id: "Todos", label: "Todos", icon: "" },
  { id: "Exposición", label: "Exposición", icon: "🎨" },
  { id: "Teatro/Danza", label: "Teatro/Danza", icon: "🎭" },
  { id: "Música", label: "Música", icon: "🎵" },
  { id: "Literatura", label: "Literatura", icon: "📚" },
  { id: "Visita guiada", label: "Visita guiada", icon: "🏛️" },
  { id: "Feria", label: "Feria", icon: "📖" },
  { id: "Taller", label: "Taller", icon: "✏️" },
  { id: "Tango", label: "Tango", icon: "💃" },
  { id: "Jazz", label: "Jazz", icon: "🎷" },
  { id: "Cine", label: "Cine", icon: "🎬" },
  { id: "Charla", label: "Charla", icon: "🎤" },
  { id: "Stand-up", label: "Stand-up", icon: "😂" },
  { id: "Presentación", label: "Presentación", icon: "📕" },
  { id: "Recorrido nocturno", label: "Recorrido nocturno", icon: "🏷️" },
  { id: "Inauguración", label: "Inauguración", icon: "🎉" },
  { id: "Concierto", label: "Concierto", icon: "🎻" },
  { id: "Performance", label: "Performance", icon: "🎪" },
];

const INITIAL_AGENDA: AgendaEvent[] = [
  {
    id: "ag-1",
    titulo: "Lobgesang (Mendelssohn) – Orquesta Académica del Teatro Colón",
    lugar: "Teatro Colón",
    tipo: "Concierto",
    fecha: "2026-09-05",
    fechaFormatted: "Sábado 5 sep (17:00 hs)",
    isToday: false,
    precioTipo: "con_entrada",
    precioTexto: "Desde $6.000",
    iconEmoji: "🎻",
  },
  {
    id: "ag-2",
    titulo: "Homenaje a Jorge Luis Borges: 40 Años",
    lugar: "Palacio Libertad (CCK)",
    tipo: "Exposición",
    fecha: "2026-09-05",
    fechaFormatted: "Sábado 5 sep",
    isToday: false,
    precioTipo: "gratis",
    precioTexto: "Entrada Gratuita",
    iconEmoji: "📚",
  },
  {
    id: "ag-3",
    titulo: "Show Inmersivo 360°: Luces del Universo",
    lugar: "Planetario Galileo Galilei",
    tipo: "Exposición",
    fecha: "2026-09-06",
    fechaFormatted: "Domingo 6 sep",
    precioTipo: "con_entrada",
    precioTexto: "$3.000 general",
    iconEmoji: "🌌",
  },
  {
    id: "ag-4",
    titulo: "Thomas Demand: El tartamudeo de la historia",
    lugar: "Fundación Proa",
    tipo: "Exposición",
    fecha: "2026-09-06",
    fechaFormatted: "Domingo 6 sep",
    precioTipo: "con_entrada",
    precioTexto: "$5.000 general",
    iconEmoji: "📷",
  },
  {
    id: "ag-5",
    titulo: "FIBA 2026 — Festival Internacional de Buenos Aires (Apertura)",
    lugar: "Teatro Colón",
    tipo: "Teatro/Danza",
    fecha: "2026-09-09",
    fechaFormatted: "Miércoles 9 sep",
    precioTipo: "gratis",
    precioTexto: "Entrada Libre con reserva previa",
    iconEmoji: "🎭",
  },
  {
    id: "ag-6",
    titulo: "Premio Andreani de Arte, Ciencia y Tecnología",
    lugar: "Fundación Andreani",
    tipo: "Inauguración",
    fecha: "2026-09-10",
    fechaFormatted: "Jueves 10 sep",
    precioTipo: "gratis",
    precioTexto: "Entrada Gratuita",
    iconEmoji: "🤖",
  },
  {
    id: "ag-7",
    titulo: "La ópera de tres centavos — Kurt Weill / Bertolt Brecht",
    lugar: "Teatro Colón",
    tipo: "Teatro/Danza",
    fecha: "2026-09-11",
    fechaFormatted: "Viernes 11 sep (20:00 hs)",
    precioTipo: "con_entrada",
    precioTexto: "Desde $10.000",
    iconEmoji: "🎭",
  },
  {
    id: "ag-8",
    titulo: "La Bomba de Tiempo — Percusión en Vivo",
    lugar: "Ciudad Cultural Konex",
    tipo: "Música",
    fecha: "2026-09-12",
    fechaFormatted: "Sábado 12 sep",
    precioTipo: "con_entrada",
    precioTexto: "$9.000 general",
    iconEmoji: "🥁",
  },
  {
    id: "ag-9",
    titulo: "Visitas Guiadas Nocturnas & Faro Iluminado",
    lugar: "Palacio Barolo",
    tipo: "Recorrido nocturno",
    fecha: "2026-09-13",
    fechaFormatted: "Domingo 13 sep",
    precioTipo: "con_entrada",
    precioTexto: "$14.000 general",
    iconEmoji: "🏛️",
  },
  {
    id: "ag-10",
    titulo: "Federico Klemm: Iluminador de mitos",
    lugar: "Centro Cultural Recoleta",
    tipo: "Exposición",
    fecha: "2026-09-16",
    fechaFormatted: "Miércoles 16 sep",
    precioTipo: "gratis",
    precioTexto: "Entrada Gratuita",
    iconEmoji: "🎨",
  },
  {
    id: "ag-11",
    titulo: "Viva Frida: Exposición de Frida Kahlo",
    lugar: "MALBA",
    tipo: "Inauguración",
    fecha: "2026-09-19",
    fechaFormatted: "Sábado 19 sep (19:00 hs)",
    precioTipo: "gratis",
    precioTexto: "Entrada Libre y Gratuita en inauguración",
    iconEmoji: "💖",
  },
  {
    id: "ag-12",
    titulo: "Ballet Estable: El Lago de los Cisnes (Últimas funciones)",
    lugar: "Teatro Colón",
    tipo: "Teatro/Danza",
    fecha: "2026-09-28",
    fechaFormatted: "Lunes 28 sep",
    precioTipo: "con_entrada",
    precioTexto: "Desde $12.000",
    iconEmoji: "🩰",
  },
];

interface AgendaCulturalModalProps {
  onClose: () => void;
  onSelectPlace?: (lugar: string) => void;
}

export const AgendaCulturalModal = ({
  onClose,
  onSelectPlace,
}: AgendaCulturalModalProps) => {
  const [selectedFilter, setSelectedFilter] = useState("Todos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [events, setEvents] = useState<AgendaEvent[]>(INITIAL_AGENDA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        let fetchedEvents: any[] = [];
        try {
          const { data } = await supabase.from("eventos").select("*");
          if (data) {
            fetchedEvents = data.filter((e) => !e.estado || e.estado === "aprobado");
          }
        } catch {
          fetchedEvents = [];
        }

        const merged: AgendaEvent[] = [...INITIAL_AGENDA];

        if (fetchedEvents && fetchedEvents.length > 0) {
          fetchedEvents.forEach((item, index) => {
            const titleLower = (item.titulo || "").toLowerCase();
            const alreadyExists = merged.some((m) => {
              const mLower = m.titulo.toLowerCase();
              return mLower === titleLower || (mLower.length > 5 && titleLower.length > 5 && (mLower.includes(titleLower) || titleLower.includes(mLower)));
            });

            if (!alreadyExists) {
              const rawDate = item.fecha_evento || (item.fecha_inicio ? item.fecha_inicio.split("T")[0] : "2026-09-15");
              let formattedDate = rawDate;
              let isToday = false;

              try {
                const dateObj = new Date(rawDate + "T00:00:00");
                if (!isNaN(dateObj.getTime())) {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const compareDate = new Date(dateObj);
                  compareDate.setHours(0, 0, 0, 0);
                  isToday = compareDate.getTime() === now.getTime();

                  const weekday = dateObj.toLocaleDateString("es-AR", { weekday: "long" });
                  const month = dateObj.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
                  const dayNum = dateObj.getDate();
                  formattedDate = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dayNum} ${month}${item.hora ? ` (${item.hora})` : ""}`;
                }
              } catch {
                formattedDate = rawDate;
              }

              const isGratis = !item.precio || item.precio.toLowerCase().includes("gratis") || item.precio.toLowerCase().includes("gratuita");

              let emoji = "📌";
              const t = item.titulo?.toLowerCase() || "";
              if (t.includes("concierto") || t.includes("filarmónica") || t.includes("orquesta")) emoji = "🎻";
              else if (t.includes("retrospectiva") || t.includes("arte") || t.includes("muestra") || t.includes("exposición")) emoji = "🎨";
              else if (t.includes("jazz") || t.includes("blues")) emoji = "🎷";
              else if (t.includes("teatro") || t.includes("ópera") || t.includes("danza") || t.includes("ballet")) emoji = "🎭";
              else if (t.includes("libro") || t.includes("borges") || t.includes("lectura")) emoji = "📚";
              else if (t.includes("planetario") || t.includes("universo") || t.includes("estrellas")) emoji = "🌌";
              else if (t.includes("foto") || t.includes("fotografía")) emoji = "📷";

              merged.push({
                id: item.id || `sp-${index}`,
                titulo: item.titulo || "Evento Cultural",
                lugar: item.lugar || item.nombre_lugar || "Espacio Cultural",
                tipo: item.tipo || (emoji === "🎻" ? "Concierto" : emoji === "🎨" ? "Exposición" : "Teatro/Danza"),
                fecha: rawDate,
                fechaFormatted: formattedDate,
                isToday,
                precioTipo: isGratis ? "gratis" : "con_entrada",
                precioTexto: item.precio || (isGratis ? "Gratis" : "Con entrada"),
                iconEmoji: emoji,
                fuenteUrl: item.fuente_url,
                instagramUrl: item.instagram_url,
              });
            }
          });
        }

        setEvents(merged);
      } catch {
        setEvents(INITIAL_AGENDA);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((evt) => {
      if (evt.tipo) {
        counts[evt.tipo] = (counts[evt.tipo] || 0) + 1;
      }
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (selectedFilter === "Todos") return events;
    return events.filter((evt) => {
      if (selectedFilter === "Exposición") return evt.tipo === "Exposición" || evt.iconEmoji === "🎨";
      if (selectedFilter === "Concierto") return evt.tipo === "Concierto" || evt.iconEmoji === "🎻";
      if (selectedFilter === "Teatro/Danza") return evt.tipo === "Teatro/Danza" || evt.iconEmoji === "🎭";
      if (selectedFilter === "Jazz") return evt.tipo === "Jazz" || evt.iconEmoji === "🎷";
      if (selectedFilter === "Música") return evt.tipo === "Música" || evt.tipo === "Concierto" || evt.tipo === "Jazz";
      return evt.tipo?.toLowerCase() === selectedFilter.toLowerCase();
    });
  }, [events, selectedFilter]);

  const groupedByDate = useMemo(() => {
    const groups: { dateFormatted: string; isToday?: boolean; items: AgendaEvent[] }[] = [];
    filteredEvents.forEach((evt) => {
      let group = groups.find((g) => g.dateFormatted === evt.fechaFormatted);
      if (!group) {
        group = { dateFormatted: evt.fechaFormatted, isToday: evt.isToday, items: [] };
        groups.push(group);
      }
      group.items.push(evt);
    });
    return groups;
  }, [filteredEvents]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between bg-card/50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-foreground tracking-tight">
                Agenda Cultural
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Próximos 30 días en Buenos Aires</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-lg"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>🔍</span>
            <span className="font-semibold text-foreground">
              {selectedFilter === "Todos" ? "Todos los tipos" : `${selectedFilter} (${filteredEvents.length})`}
            </span>
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <span>{isFilterOpen ? "▲ Cerrar" : "▼ Filtrar"}</span>
          </button>
        </div>

        {/* Categories Drawer */}
        {isFilterOpen && (
          <div className="p-4 sm:p-5 border-b border-border bg-muted/30 shrink-0 max-h-[220px] sm:max-h-[280px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top duration-150">
            <div className="flex flex-wrap gap-2.5 sm:gap-3 pb-1">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedFilter === cat.id;
                const count = cat.id === "Todos" ? events.length : categoryCounts[cat.id] || 0;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedFilter(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all border whitespace-nowrap min-h-[38px] ${
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-sm"
                        : "bg-background text-foreground/80 border-border/80 hover:border-foreground/40 hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {cat.icon && <span className="text-sm">{cat.icon}</span>}
                    <span>{cat.label}</span>
                    {count > 0 && (
                      <span
                        className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <i className="fas fa-circle-notch fa-spin text-purple-600 text-base" />
              <span>Cargando agenda cultural...</span>
            </div>
          ) : groupedByDate.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
              <div className="text-3xl">🎭</div>
              <p className="font-semibold text-foreground">No hay eventos para esta categoría</p>
              <p className="text-xs">Probá seleccionando "Todos" en los filtros</p>
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.dateFormatted} className="space-y-3">
                <div className="flex items-center gap-2 pt-1">
                  {group.isToday && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500 text-white font-bold text-[10px] tracking-wider uppercase">
                      HOY
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-foreground">{group.dateFormatted}</h3>
                  <div className="flex-1 border-t border-border/60" />
                </div>

                <div className="space-y-2.5">
                  {group.items.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => {
                        if (onSelectPlace) {
                          onSelectPlace(evt.lugar);
                          onClose();
                        }
                      }}
                      className="group p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition-all cursor-pointer shadow-sm hover:shadow flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        {evt.iconEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug line-clamp-2">
                          {evt.titulo}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <span>📍</span>
                          <span className="truncate">{evt.lugar}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {evt.precioTipo === "gratis" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <span>✅</span> Gratis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md">
                              <span>🎟️</span> Con entrada
                            </span>
                          )}
                          {evt.precioTexto && evt.precioTipo === "con_entrada" && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {evt.precioTexto}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-muted-foreground group-hover:text-foreground transition-colors text-lg pt-1">
                        ›
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgendaCulturalModal;
