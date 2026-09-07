import React, { useState } from "react";

interface AdminPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPasswordModal = ({ onClose, onSuccess }: AdminPasswordModalProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim().toLowerCase();
    if (clean === "2026" || clean === "radar" || clean === "admin") {
      try {
        localStorage.setItem("radar_admin_access", "true");
      } catch {}
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card text-card-foreground border border-border w-full max-w-xs rounded-2xl shadow-2xl p-5 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground text-sm"
        >
          ✕
        </button>

        <div className="text-center mb-4 pt-1">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl mx-auto mb-2">
            🔐
          </div>
          <h3 className="font-bold text-base text-foreground">Acceso de Administrador</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ingresa la clave para desbloquear el panel y herramientas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Clave o PIN (ej: 2026)"
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-center text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && (
              <p className="text-xs text-red-500 text-center mt-1.5 font-medium animate-in fade-in">
                Clave incorrecta. Intenta nuevamente.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all active:scale-95"
          >
            Desbloquear Modo Admin
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPasswordModal;
