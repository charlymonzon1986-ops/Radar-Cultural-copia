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
      formattedDate: `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`,
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
  if (diffDays >= 0) {
    return {
      isFuture: true,
      diffDays,
      formattedDate: `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`,
    };
  }
  return null;
};

const getVenueFallbacks = (lugar: string) => {
  const norm = lugar.toLowerCase();
  let ticketUrl: string | null = null;
  let instagramUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(
    lugar.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  )}/`;

  if (norm.includes("malba")) {
    ticketUrl = "https://www.malba.org.ar/entradas/";
    instagramUrl = "https://www.instagram.com/museomalba/";
  } else if (norm.includes("vorterix")) {
    ticketUrl = "https://www.allpress.com.ar/";
    instagramUrl = "https://www.instagram.com/teatrovorterix/";
  } else if (norm.includes("colón") || norm.includes("colon")) {
    ticketUrl = "https://teatrocolon.org.ar/es/temporada/";
    instagramUrl = "https://www.instagram.com/teatrocolon/";
  } else if (norm.includes("bellas artes")) {
    ticketUrl = "https://www.bellasartes.gob.ar/visita/";
    instagramUrl = "https://www.instagram.com/bellasartesargentina/";
  } else if (norm.includes("moderno") || norm.includes("mamba")) {
    ticketUrl = "https://museomoderno.org/entradas/";
    instagramUrl = "https://www.instagram.com/modernoba/";
  } else if (norm.includes("cck") || norm.includes("palacio libertad")) {
    ticketUrl = "https://palaciolibertad.gob.ar/";
    instagramUrl = "https://www.instagram.com/palacio_libertad/";
  } else if (norm.includes("recoleta")) {
    ticketUrl = "https://centroculturalrecoleta.org/";
    instagramUrl = "https://www.instagram.com/elrecoleta/";
  } else if (norm.includes("san martín") || norm.includes("san martin")) {
    ticketUrl = "https://complejoteatral.gob.ar/";
    instagramUrl = "https://www.instagram.com/elculturalsanmartin/";
  } else if (norm.includes("usina del arte")) {
    ticketUrl = "https://usinadelarte.ar/";
    instagramUrl = "https://www.instagram.com/usinadelarte/";
  } else if (norm.includes("macba")) {
    ticketUrl = "https://macba.com.ar/";
    instagramUrl = "https://www.instagram.com/museomacba/";
  }

  return { ticketUrl, instagramUrl };
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

  const venueFallbacks = getVenueFallbacks(lugar);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card text-card-foreground rounded-3xl shadow-2xl w-full max-w-xs sm:max-w-sm md:max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar border border-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <h2
            className="font-display text-lg sm:text-xl font-bold flex items-center gap-2"
            style={{ color }}
          >
            <span>🗓️</span> Eventos
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-bold transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
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
                href={venueFallbacks.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-2xl px-5 text-muted-foreground bg-background border border-border/80 hover:bg-muted/40 transition-all shadow-xs active:scale-[0.98]"
              >
                <i className="fab fa-instagram text-base" /> Ver en Instagram
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {eventos.map((evt) => {
                const imgFailed = failedImages[evt.id];
                const showImg = evt.imagen_url && !imgFailed;
                const closingSoon = checkClosingSoon(evt.fecha_cierre);
                const futureInaug = checkFutureInauguration(evt.fecha_evento);

                // Ticket URL: event's direct entrance or source link, or venue tickets fallback
                const ticketUrl =
                  evt.entrada_url ||
                  evt.fuente_url ||
                  (evt.precio?.toLowerCase().includes("gratis")
                    ? null
                    : venueFallbacks.ticketUrl);

                // Instagram URL: event's specific IG link or venue official IG
                const instagramUrl = evt.instagram_url || venueFallbacks.instagramUrl;

                return (
                  <div
                    key={evt.id}
                    className="rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
                  >
                    {/* Future Inauguration banner */}
                    {futureInaug?.isFuture && (
                      <div
                        className="w-full font-bold rounded-xl py-2 px-3 text-xs sm:text-[13px] flex items-center justify-center gap-2 shadow-xs"
                        style={{ background: "#F1B213", color: "#451a03" }}
                      >
                        <span className="text-sm">🎉</span>
                        <span>Inaugura el {futureInaug.formattedDate}</span>
                      </div>
                    )}

                    <h3 className="font-display font-bold text-base sm:text-lg text-foreground leading-snug">
                      {evt.titulo}
                    </h3>

                    {evt.descripcion && (
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {evt.descripcion}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium pt-0.5">
                      {evt.fecha_evento && (
                        <span>
                          🗓️ {futureInaug?.isFuture ? "Inaugura: " : "Inicio: "}
                          {formatDate(evt.fecha_evento)}
                        </span>
                      )}
                      {evt.hora && <span>⏱️ {evt.hora}</span>}
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
                              {closingSoon.formattedDate}
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

                    {/* Action buttons on every single event */}
                    <div className="pt-2 flex flex-col gap-2.5">
                      {ticketUrl && (
                        <a
                          href={ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-2xl px-5 text-white transition-all shadow-sm hover:opacity-90 active:scale-[0.98]"
                          style={{ background: "#9333EA" }}
                        >
                          <span>🎟️</span>
                          <span>Comprar entradas</span>
                        </a>
                      )}

                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-2xl px-5 text-muted-foreground bg-background border border-border/80 hover:bg-muted/40 transition-all shadow-xs active:scale-[0.98]"
                      >
                        <i className="fab fa-instagram text-base" />
                        <span>Ver en Instagram</span>
                      </a>
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

