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
  titulo: string;
  descripcion: string | null;
  fecha_evento: string | null;
  fecha_cierre: string | null;
  instagram_url: string | null;
  entrada_url: string | null;
  fuente_url?: string | null;
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
  if (diffDays > 0) {
    return {
      isFuture: true,
      diffDays,
      formattedDate: `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`,
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
    };
  }
  return null;
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
          .select("titulo, descripcion, fecha_evento, fecha_cierre, instagram_url, entrada_url, fuente_url")
          .eq("lugar", nombre)
          .eq("estado", "aprobado")
          .order("fecha_evento", { ascending: true })
          .limit(1);
        if (data && data.length > 0) {
          setPreview(data[0] as EventoPreview);
        }
      } catch (err) {
        console.error("Error fetching preview:", err);
      }
    };
    fetchPreview();
  }, [nombre, hasEvent]);

  const ticketsUrl = preview?.entrada_url || preview?.fuente_url;
  const futureInaug = checkFutureInauguration(preview?.fecha_evento || null);
  const closingSoon = checkClosingSoon(preview?.fecha_cierre || null);

  return (
    <div
      className="text-center p-3.5 sm:p-4 w-[260px] sm:w-[290px] max-w-[85vw] bg-card text-card-foreground rounded-2xl"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Venue Name */}
      <h3
        className="font-bold text-base sm:text-lg mb-3 tracking-wide"
        style={{ color }}
      >
        {nombre}
      </h3>

      {/* Event preview card */}
      {preview && (
        <div
          className="text-left mb-3.5 p-3 rounded-2xl border bg-card/80 space-y-2 shadow-sm transition-all"
          style={{ borderColor: `${color}35` }}
        >
          {/* Banner: Inaugura el... / Cierre próximo */}
          {futureInaug?.isFuture ? (
            <div className="w-full bg-amber-400 hover:bg-amber-300 dark:bg-amber-500 text-amber-950 font-bold rounded-lg py-1.5 px-2.5 text-[11px] sm:text-xs flex items-center justify-start gap-1.5 shadow-sm">
              <span>🎉</span>
              <span>Inaugura el {futureInaug.formattedDate}</span>
            </div>
          ) : closingSoon?.isSoon ? (
            <div className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg py-1.5 px-2.5 text-[11px] sm:text-xs flex items-center justify-start gap-1.5 shadow-sm">
              <span>⚠️</span>
              <span>¡PRÓXIMO A CERRAR! Cierra: {closingSoon.formattedDate}</span>
            </div>
          ) : null}

          {/* Event Title */}
          <p className="text-xs sm:text-[13px] font-bold text-foreground leading-snug">
            {preview.titulo.startsWith("🔥") ? "" : "🔥 "}
            {preview.titulo}
          </p>

          {/* Event Description */}
          {preview.descripcion && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
              {preview.descripcion}
            </p>
          )}

          {/* Event Meta: Date, Tickets, IG */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-[11px] text-muted-foreground font-medium">
            {preview.fecha_evento && (
              <span>
                📅 {futureInaug?.isFuture ? "Inaugura: " : "Inicio: "}
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

            {preview.instagram_url && (
              <a
                href={preview.instagram_url}
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
