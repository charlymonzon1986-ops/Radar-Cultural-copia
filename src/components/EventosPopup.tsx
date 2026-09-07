import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_evento: string | null;
  hora: string | null;
  instagram_url: string | null;
  imagen_url: string | null;
  precio: string | null;
  fecha_cierre: string | null;
  entrada_url: string | null;
  fuente_url?: string | null;
}

interface EventosPopupProps {
  lugar: string;
  color: string;
  onClose: () => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "";
  const match = dateStr.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  return dateStr;
};

const checkClosingSoon = (dateStr: string | null) => {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const target = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays <= 7) {
    return {
      isSoon: true,
      daysLabel:
        diffDays === 0
          ? "¡Último día hoy!"
          : diffDays === 1
          ? "¡Cierra mañana!"
          : `¡Cierra en ${diffDays} días!`,
    };
  }
  return null;
};

const checkFutureInauguration = (dateStr: string | null) => {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const target = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0) {
    return {
      isFuture: true,
      diffDays,
      formattedDate: `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`,
    };
  }
  return null;
};

const EventosPopup = ({ lugar, color, onClose }: EventosPopupProps) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const { data } = await supabase
          .from("eventos")
          .select(
            "id, titulo, descripcion, fecha_evento, hora, instagram_url, imagen_url, precio, fecha_cierre, entrada_url, fuente_url"
          )
          .eq("lugar", lugar)
          .eq("estado", "aprobado")
          .order("fecha_evento", { ascending: true });
        if (data) setEventos(data as Evento[]);
      } catch (err) {
        console.error("Error fetching eventos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventos();
  }, [lugar]);

  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const instagramSearchUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(
    lugar.replace(/\s+/g, "").toLowerCase()
  )}/`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card text-card-foreground rounded-3xl shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-md max-h-[82vh] overflow-y-auto custom-scrollbar border border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <h2
            className="font-display text-lg sm:text-xl font-bold flex items-center gap-2"
            style={{ color }}
          >
            <span>📅</span> Eventos
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xl transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1">
            📍 {lugar}
          </p>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <span className="inline-block animate-spin mr-2">⏳</span> Cargando eventos...
            </div>
          ) : eventos.length === 0 ? (
            <div className="py-6 px-4 text-center bg-muted/20 rounded-2xl border border-border/60 my-2 space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
                🏛️
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Sin eventos vigentes</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Este espacio no registra eventos o exposiciones activas en este momento.
                </p>
              </div>
              <a
                href={instagramSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs font-bold rounded-xl px-4 py-3 text-white transition-all shadow-md hover:opacity-95 active:scale-[0.98] w-full"
                style={{
                  background:
                    "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                }}
              >
                <i className="fab fa-instagram text-base" /> Ver en Instagram
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {eventos.map((evt) => {
                const imgFailed = failedImages[evt.id];
                const showImg = evt.imagen_url && !imgFailed;
                const ticketsUrl = evt.entrada_url || evt.fuente_url || evt.instagram_url;
                const closingSoon = checkClosingSoon(evt.fecha_cierre);
                const futureInaug = checkFutureInauguration(evt.fecha_evento);

                return (
                  <div
                    key={evt.id}
                    className="rounded-2xl border border-border/80 bg-muted/30 p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
                  >
                    {/* Future Inauguration banner */}
                    {futureInaug?.isFuture && (
                      <div className="w-full bg-amber-400 hover:bg-amber-300 dark:bg-amber-500 text-amber-950 font-bold rounded-xl py-2 px-3 text-xs flex items-center justify-center gap-2 border border-amber-500/50 shadow-sm">
                        <span>🎉</span>
                        <span>Inaugura el {futureInaug.formattedDate}</span>
                        {futureInaug.diffDays === 1 ? (
                          <span className="bg-amber-600/25 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                            ¡Mañana!
                          </span>
                        ) : futureInaug.diffDays <= 7 ? (
                          <span className="bg-amber-600/25 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                            en {futureInaug.diffDays} días
                          </span>
                        ) : null}
                      </div>
                    )}

                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {evt.titulo}
                    </h3>

                    {evt.descripcion && (
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {evt.descripcion}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium pt-0.5">
                      {evt.fecha_evento && (
                        <span>
                          📅 {futureInaug?.isFuture ? "Inaugura: " : "Inicio: "}
                          {formatDate(evt.fecha_evento)}
                        </span>
                      )}
                      {evt.hora && <span>🕐 {evt.hora}</span>}
                    </div>

                    {/* Closing soon alert */}
                    {closingSoon?.isSoon && (
                      <div className="bg-amber-500/15 border-2 border-amber-500/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 rounded-xl p-2.5 my-2 shadow-sm animate-pulse flex items-start gap-2">
                        <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            <span>¡PRÓXIMO A CERRAR!</span>
                            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-extrabold normal-case">
                              {closingSoon.daysLabel}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold mt-1 text-amber-900 dark:text-amber-100">
                            Cierra:{" "}
                            <span className="underline font-black text-amber-950 dark:text-amber-50">
                              {formatDate(evt.fecha_cierre)}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {evt.fecha_cierre && !closingSoon?.isSoon && (
                      <p className="text-xs font-semibold text-foreground">
                        Cierra: {formatDate(evt.fecha_cierre)}
                      </p>
                    )}

                    {evt.precio && (
                      <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                        <span>💰</span>
                        <span>{evt.precio}</span>
                      </p>
                    )}

                    {showImg && (
                      <div className="relative w-full h-36 sm:h-40 rounded-xl bg-muted overflow-hidden mt-2">
                        <img
                          src={evt.imagen_url!}
                          alt={evt.titulo}
                          onError={() => handleImageError(evt.id)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      {ticketsUrl && (
                        <a
                          href={ticketsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-xl px-5 bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
                        >
                          <span>🎟️</span> Comprar entradas
                        </a>
                      )}
                      {evt.instagram_url && (
                        <a
                          href={evt.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-xl px-5 text-muted-foreground bg-background border border-border hover:bg-muted/50 transition-colors"
                        >
                          <i className="fab fa-instagram" /> Ver en Instagram
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventosPopup;

