import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminSyncModalProps {
  onClose: () => void;
  onLogoutAdmin?: () => void;
}

export const AdminSyncModal = ({ onClose, onLogoutAdmin }: AdminSyncModalProps) => {
  const [loadingCount, setLoadingCount] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseCount, setSupabaseCount] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    fetchCount();
  }, []);

  const fetchCount = async () => {
    setLoadingCount(true);
    try {
      const { count, error } = await supabase
        .from("eventos")
        .select("*", { count: "exact", head: true });

      if (error) {
        setSupabaseCount(null);
        setSyncStatus("No se pudo conectar con Supabase o faltan credenciales.");
        setStatusType("info");
      } else {
        setSupabaseCount(count ?? 0);
      }
    } catch {
      setSupabaseCount(null);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/eventos_radar_cultural.json");
      const eventsData = await res.json();

      const { data: existing, error: fetchErr } = await supabase
        .from("eventos")
        .select("id");

      if (fetchErr) throw fetchErr;

      if (existing && existing.length > 0) {
        const ids = existing.map((e) => e.id);
        for (let i = 0; i < ids.length; i += 50) {
          const chunk = ids.slice(i, i + 50);
          const { error: delErr } = await supabase
            .from("eventos")
            .delete()
            .in("id", chunk);
          if (delErr) throw new Error(`Error al limpiar: ${delErr.message}`);
        }
      }

      const formatted = eventsData.map((e: any) => ({
        lugar: e.lugar,
        titulo: e.titulo,
        descripcion: e.descripcion || null,
        fecha_evento: e.fecha_evento || null,
        hora: e.hora || null,
        fuente_url: e.fuente_url || null,
        instagram_url: e.instagram_url || null,
        estado: "aprobado",
      }));

      for (let i = 0; i < formatted.length; i += 50) {
        const chunk = formatted.slice(i, i + 50);
        const { error: insErr } = await supabase.from("eventos").insert(chunk);
        if (insErr) throw insErr;
      }

      setSyncStatus(`¡Sincronización completada con éxito! Se cargaron los ${eventsData.length} eventos oficiales.`);
      setStatusType("success");
      await fetchCount();
    } catch (err: any) {
      setSyncStatus(`Error al sincronizar: ${err.message || "Error desconocido"}`);
      setStatusType("error");
    } finally {
      setIsSyncing(false);
    }
  };

  const defaultSql = `-- Ejecutar en Supabase Dashboard -> SQL Editor:
DELETE FROM public.eventos WHERE fecha_cierre < '2026-09-05' OR titulo ILIKE '%matilde mar%' OR titulo ILIKE '%ciclo de jazz%';
-- O vaciar completamente:
-- DELETE FROM public.eventos;`;

  const handleCopySql = async () => {
    try {
      const res = await fetch("/sincronizar_supabase_68_eventos.sql");
      const sqlText = await res.text();
      await navigator.clipboard.writeText(sqlText);
      setCopiedSql(true);
      setStatusType("info");
      setSyncStatus("✓ Script oficial copiado (68 eventos). Pégalo en tu Supabase SQL Editor y dale Run.");
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      await navigator.clipboard.writeText(defaultSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg font-bold">Sincronización & Panel Admin</h2>
              <p className="text-xs text-muted-foreground">
                Base de datos de eventos para Mapa y Bot de Guiones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Status block */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Eventos en el Mapa actual:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                68 eventos verificados
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Eventos en Base Supabase:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  loadingCount
                    ? "bg-muted text-muted-foreground"
                    : supabaseCount === 68
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {loadingCount ? "Consultando..." : supabaseCount !== null ? `${supabaseCount} eventos` : "No disponible / Sin auth"}
              </span>
            </div>

            {supabaseCount !== null && supabaseCount > 68 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Tu Supabase tiene {supabaseCount} eventos guardados (incluye los 68 del mapa más eventos históricos antiguos).
              </p>
            )}
          </div>

          {/* Sync Button */}
          <div className="space-y-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <i className={`fas ${isSyncing ? "fa-spinner fa-spin" : "fa-bolt"}`} />
              {isSyncing ? "Sincronizando base de datos..." : "⚡ Sincronizar Ahora (Dejar 68 en Supabase)"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Reemplaza la tabla <code>eventos</code> de Supabase con los 68 eventos oficiales de la cartelera de septiembre 2026.
            </p>
          </div>

          {syncStatus && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                statusType === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : statusType === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
              }`}
            >
              {syncStatus}
            </div>
          )}

          {/* SQL Alternative */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Alternativa rápida: Comando SQL para Supabase
              </span>
              <button
                onClick={handleCopySql}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                {copiedSql ? "✓ Copiado" : "Copiar SQL"}
              </button>
            </div>
            <pre className="p-3 bg-muted/60 rounded-lg text-[11px] overflow-x-auto text-muted-foreground font-mono">
              {defaultSql}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          {onLogoutAdmin ? (
            <button
              onClick={() => {
                onLogoutAdmin();
                onClose();
              }}
              className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 hover:underline"
            >
              🔒 Ocultar modo Admin
            </button>
          ) : (
            <Link
              to="/admin"
              onClick={onClose}
              className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1.5"
            >
              Ir a la página completa (/admin) →
            </Link>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors ml-auto"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSyncModal;
