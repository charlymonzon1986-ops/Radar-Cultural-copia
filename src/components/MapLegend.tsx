import { useState } from "react";
import { CATEGORIAS, CategoryKey } from "@/data/espacios";

interface MapLegendProps {
  activeFilter: CategoryKey | "TODOS";
  onFilterChange: (filter: CategoryKey | "TODOS") => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onSecretTrigger?: () => void;
  onLogoutAdmin?: () => void;
}

const MapLegend = ({
  activeFilter,
  onFilterChange,
  isAdmin = false,
  onOpenAdmin,
  onSecretTrigger,
  onLogoutAdmin,
}: MapLegendProps) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640;
    }
    return false;
  });
  const [clicks, setClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleTitleClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 800) {
      const nextClicks = clicks + 1;
      if (nextClicks >= 5) {
        setClicks(0);
        onSecretTrigger?.();
      } else {
        setClicks(nextClicks);
      }
    } else {
      setClicks(1);
    }
    setLastClickTime(now);
  };

  if (isCollapsed) {
    return (
      <div
        className="absolute top-[68px] sm:top-3 left-3 z-[1000]"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 h-9 px-3 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-md text-foreground font-bold text-xs hover:bg-muted active:scale-95 transition-all"
          title="Abrir menú de filtros"
        >
          <i className="fas fa-bars text-primary text-xs" />
          <span>Radar Cultural</span>
          <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-md max-w-[100px] truncate">
            {activeFilter === "TODOS" ? "Todos" : CATEGORIAS[activeFilter]?.label || activeFilter}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute top-[68px] sm:top-3 left-3 z-[1000] w-[250px] sm:w-[260px] bg-card/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 max-h-[82vh] overflow-y-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <div
          onClick={handleTitleClick}
          className="flex items-center gap-1.5 cursor-default select-none active:opacity-80"
          title="Radar Cultural"
        >
          <i className="fas fa-compass text-primary text-xs" />
          <h4 className="font-display text-xs font-bold text-foreground tracking-wide">
            RADAR CULTURAL
          </h4>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          title="Contraer menú"
          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-lg transition-colors h-7"
        >
          <span>Contraer</span>
          <i className="fas fa-chevron-left text-[9px]" />
        </button>
      </div>

      <div className="space-y-0.5">
        <button
          onClick={() => onFilterChange("TODOS")}
          className={`flex items-center w-full gap-2.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all ${
            activeFilter === "TODOS"
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-foreground hover:bg-muted/80"
          }`}
        >
          <i
            className={`fas fa-layer-group text-xs ${
              activeFilter === "TODOS" ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          />
          <span className="flex-1 text-left truncate">Todos</span>
        </button>

        {(Object.entries(CATEGORIAS) as [CategoryKey, typeof CATEGORIAS[CategoryKey]][]).map(
          ([key, cat]) => {
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => onFilterChange(key)}
                className={`flex items-center w-full gap-2.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-foreground hover:bg-muted/80"
                }`}
              >
                <i
                  className={`fas ${cat.icon} text-xs`}
                  style={{ color: isActive ? "currentColor" : cat.color }}
                />
                <span className="flex-1 text-left truncate">{cat.label}</span>
              </button>
            );
          }
        )}
      </div>

      <hr className="border-border/80 my-2" />

      <div className="text-center">
        <p className="text-[9px] text-muted-foreground mb-1">Creado por:</p>
        <a
          href="https://www.instagram.com/radarcultural_/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full h-8 text-xs font-bold text-white rounded-lg transition-opacity hover:opacity-90 active:scale-98"
          style={{
            background:
              "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
          }}
        >
          <i className="fab fa-instagram text-xs" />
          <span>radarcultural_</span>
        </a>

        {isAdmin && (
          <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[11px] animate-in fade-in">
            <button
              onClick={onOpenAdmin}
              className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              ⚙️ Admin & Sync
            </button>
            {onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                title="Cerrar modo Administrador (Ocultar botones)"
              >
                🔒 Ocultar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLegend;
