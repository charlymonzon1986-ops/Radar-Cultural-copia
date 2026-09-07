import React from "react";
import { CATEGORIAS, CategoryKey } from "@/data/espacios";

interface FilterPanelProps {
  activeFilter: CategoryKey | "TODOS";
  onFilterChange: (filter: CategoryKey | "TODOS") => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  activeFilter,
  onFilterChange,
  className = "",
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
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
        <span className="flex-1 text-left truncate">Todos los espacios</span>
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
  );
};

export default FilterPanel;
