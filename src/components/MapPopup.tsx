import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MapPopupProps {
  nombre: string;
  color: string;
  hasEvent: boolean;
  onOpenGallery: () => void;
  onOpenEventos: () => void;
}

interface EventoPreview {
  id?: string;
  titulo: string;
  descripcion: string | null;
  fecha_evento: string | null;
  fecha_cierre: string | null;
  instagram_url: string | null;
  entrada_url: string | null;
  fuente_url?: string | null;
  hora?: string | null;
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
      label:
        diffDays === 0
          ? "¡Inaugura hoy!"
          : diffDays === 1
          ? "¡Inaugura mañana!"
          : `Inaugura el ${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`,
    };
  }
  return null;
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

const MapPopup = ({ nombre, color, hasEvent, onOpenGallery, onOpenEventos }: MapPopupProps) => {
  const query = encodeURIComponent(nombre + " Buenos Aires");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const [preview, setPreview] = useState<EventoPreview | null>(null);

  useEffect(() => {
    if (!hasEvent) return;
    const fetchPreview = async () => {
      try {
        const { data } = await supabase
          .from("eventos")
          .select(
            "id, titulo, descripcion, fecha_evento, fecha_cierre, hora, instagram_url, entrada_url, fuente_url"
          )
          .eq("lugar", nombre)
          .eq("estado", "aprobado");

        if (data && data.length > 0) {
          const events = data as EventoPreview[];

          // 1. Look for upcoming inaugurations (e.g. Frida Kahlo in MALBA, Caifanes in Vorterix)
          const futureInaugEvents = events.filter((e) => {
            const fi = checkFutureInauguration(e.fecha_evento);
            return fi && fi.isFuture;
          });

          if (futureInaugEvents.length > 0) {
            // Sort by data richness and closest upcoming date
            futureInaugEvents.sort((a, b) => {
              const scoreA =
                (a.descripcion ? 3 : 0) +
                (a.entrada_url || a.fuente_url ? 2 : 0) +
                (a.instagram_url ? 1 : 0);
              const scoreB =
                (b.descripcion ? 3 : 0) +
                (b.entrada_url || b.fuente_url ? 2 : 0) +
                (b.instagram_url ? 1 : 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
              return (a.fecha_evento || "").localeCompare(b.fecha_evento || "");
            });
            setPreview(futureInaugEvents[0]);
            return;
          }

          // 2. Look for closing soon events
          const closingSoonEvents = events.filter((e) => {
            const cs = checkClosingSoon(e.fecha_cierre);
            return cs && cs.isSoon;
          });

          if (closingSoonEvents.length > 0) {
            setPreview(closingSoonEvents[0]);
            return;
          }

          // 3. Look for events with descriptions / links
          const richEvents = events.filter(
            (e) => e.descripcion || e.entrada_url || e.instagram_url || e.fuente_url
          );
          if (richEvents.length > 0) {
            setPreview(richEvents[0]);
            return;
          }

          // 4. Default to first event
          setPreview(events[0]);
        }
      } catch (err) {
        console.error("Error fetching preview:", err);
      }
    };
    fetchPreview();
  }, [nombre, hasEvent]);

  const venueFallbacks = getVenueFallbacks(nombre);
  const ticketsUrl = preview?.entrada_url || preview?.fuente_url || venueFallbacks.ticketUrl;
  const instagramUrl = preview?.instagram_url || venueFallbacks.instagramUrl;
  const futureInaug = checkFutureInauguration(preview?.fecha_evento || null);
  const closingSoon = checkClosingSoon(preview?.fecha_cierre || null);

  return (
    <div
      className="text-center p-3.5 sm:p-4 w-[265px] sm:w-[295px] max-w-[85vw] bg-card text-card-foreground rounded-3xl"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Venue Name */}
      <h3
        className="font-display text-lg sm:text-xl font-bold mb-3 tracking-normal"
        style={{ color }}
      >
        {nombre}
      </h3>

      {/* Event preview card */}
      {preview && (
        <div
          className="text-left mb-3.5 p-3 rounded-2xl border bg-card space-y-2 shadow-xs transition-all"
          style={{ borderColor: `${color}35` }}
        >
          {/* Banner: Inaugura el... / Cierre próximo */}
          {futureInaug?.isFuture ? (
            <div
              className="w-full font-bold rounded-xl py-2 px-3 text-xs sm:text-[13px] flex items-center justify-start gap-2 shadow-xs"
              style={{ background: "#F1B213", color: "#451a03" }}
            >
              <span className="text-sm">🎉</span>
              <span>Inaugura el {futureInaug.formattedDate}</span>
            </div>
          ) : closingSoon?.isSoon ? (
            <div
              className="w-full font-bold rounded-xl py-2 px-3 text-xs sm:text-[13px] flex items-center justify-start gap-2 shadow-xs"
              style={{ background: "#F59E0B", color: "#451a03" }}
            >
              <span className="text-sm">⚠️</span>
              <span>¡PRÓXIMO A CERRAR! Cierra: {closingSoon.formattedDate}</span>
            </div>
          ) : null}

          {/* Event Title */}
          <p className="text-xs sm:text-[14px] font-bold text-foreground leading-snug">
            {preview.titulo.startsWith("🔥") ? "" : "🔥 "}
            {preview.titulo}
          </p>

          {/* Event Description */}
          {preview.descripcion && (
            <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
              {preview.descripcion}
            </p>
          )}

          {/* Event Meta: Date, Tickets, IG */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-[11px] text-muted-foreground font-medium">
            {preview.fecha_evento && (
              <span>
                🗓️ {futureInaug?.isFuture ? "Inaugura: " : "Inicio: "}
                {formatDate(preview.fecha_evento)}
              </span>
            )}

            {ticketsUrl && (
              <a
                href={ticketsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <span>🎟️</span>
                <span>Entradas</span>
              </a>
            )}

            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <i className="fab fa-instagram" />
                <span>IG</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 w-full">
        <button
          onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] border-0 cursor-pointer"
          style={{ background: "#2A7FFF" }}
        >
          <span>📍</span>
          <span>Cómo llegar</span>
        </button>

        <button
          onClick={onOpenGallery}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] border-0 cursor-pointer"
          style={{ background: "#2ECC71" }}
        >
          <span>📸</span>
          <span>Ver/Subir Fotos</span>
        </button>

        <button
          onClick={onOpenEventos}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] border-0 cursor-pointer"
          style={{ background: "#9B59B6" }}
        >
          <span>📅</span>
          <span>{hasEvent ? "Ver Eventos" : "Eventos"}</span>
        </button>
      </div>
    </div>
  );
};

export default MapPopup;

