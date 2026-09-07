import React from "react";
import { CategoryKey, CATEGORIAS } from "@/data/espacios";
import FilterPanel from "./FilterPanel";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeFilter: CategoryKey | "TODOS";
  onFilterChange: (filter: CategoryKey | "TODOS") => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onSecretTrigger?: () => void;
  onLogoutAdmin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeFilter,
  onFilterChange,
  isAdmin = false,
  onOpenAdmin,
  onSecretTrigger,
  onLogoutAdmin,
}) => {
  const [clicks, setClicks] = React.useState(0);
  const [lastClickTime, setLastClickTime] = React.useState(0);

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

  if (!isOpen) {
    return (
      <div
        className="absolute top-3 left-3 z-[1000]"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onToggle}
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
    <aside
      className="absolute top-3 left-3 z-[1000] w-[250px] sm:w-[260px] bg-card/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 max-h-[82vh] overflow-y-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <div
          onClick={handleTitleClick}
          className="flex items-center gap-1.5 cursor-default select-none active:opacity-80"
          title="Radar Cultural (Buenos Aires)"
        >
          <i className="fas fa-compass text-primary text-xs" />
          <h4 className="font-display text-xs font-bold text-foreground tracking-wide">
            RADAR CULTURAL
          </h4>
        </div>
        <button
          onClick={onToggle}
          title="Contraer menú"
          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2 py-1 rounded-lg transition-colors h-7"
        >
          <span>Contraer</span>
          <i className="fas fa-chevron-left text-[9px]" />
        </button>
      </div>

      {/* Filter items */}
      <FilterPanel activeFilter={activeFilter} onFilterChange={onFilterChange} />

      <hr className="border-border/80 my-2" />

      {/* Creator Credits */}
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

        {/* Admin actions if unlocked */}
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
                title="Cerrar modo Administrador"
              >
                🔒 Ocultar
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
