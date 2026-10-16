import React, { useState, useRef, useEffect, useMemo } from "react";
import { Espacio, CATEGORIAS, CategoryKey } from "@/data/espacios";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: CategoryKey | "TODOS";
  onFilterChange: (filter: CategoryKey | "TODOS") => void;
  espacios: Espacio[];
  placesWithEvents: Set<string>;
  onSelectPlace: (place: Espacio) => void;
  className?: string;
}

// Accent-insensitive normalization
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  espacios,
  placesWithEvents,
  onSelectPlace,
  className = "",
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showCategoryChips, setShowCategoryChips] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = useMemo(() => normalize(searchQuery), [searchQuery]);

  // Matching places for autocomplete dropdown
  const matchingPlaces = useMemo(() => {
    if (!normalizedQuery) return [];

    return espacios.filter((lugar) => {
      const cat = CATEGORIAS[lugar.cat];
      const normName = normalize(lugar.n);
      const normCatLabel = normalize(cat?.label || "");
      const normCatKey = normalize(lugar.cat);

      return (
        normName.includes(normalizedQuery) ||
        normCatLabel.includes(normalizedQuery) ||
        normCatKey.includes(normalizedQuery)
      );
    });
  }, [espacios, normalizedQuery]);

  // Check if query matches a known category
  const matchingCategory = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return null;

    const entries = Object.entries(CATEGORIAS) as [CategoryKey, typeof CATEGORIAS[CategoryKey]][];
    for (const [key, cat] of entries) {
      const normLabel = normalize(cat.label);
      const normKey = normalize(key);
      if (normLabel.includes(normalizedQuery) || normalizedQuery.includes(normLabel) || normKey === normalizedQuery) {
        const count = espacios.filter((e) => e.cat === key).length;
        return { key, ...cat, count };
      }
    }
    return null;
  }, [espacios, normalizedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused || matchingPlaces.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < matchingPlaces.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matchingPlaces.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < matchingPlaces.length) {
        handleSelect(matchingPlaces[selectedIndex]);
      } else if (matchingCategory) {
        onFilterChange(matchingCategory.key);
        setIsFocused(false);
      } else if (matchingPlaces.length > 0) {
        handleSelect(matchingPlaces[0]);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const activeEl = resultsListRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (place: Espacio) => {
    onSelectPlace(place);
    setIsFocused(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    onSearchChange("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Highlight matching substring
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const normText = normalize(text);
    const normQ = normalize(query);
    const index = normText.indexOf(normQ);
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <>
        {before}
        <span className="font-bold text-primary underline underline-offset-2 decoration-primary/40">
          {match}
        </span>
        {after}
      </>
    );
  };

  const categoryEntries = Object.entries(CATEGORIAS) as [CategoryKey, typeof CATEGORIAS[CategoryKey]][];

  return (
    <div
      ref={containerRef}
      className={`relative z-[1000] select-none ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Input Bar */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="relative flex items-center h-11 sm:h-12 w-full rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary focus-within:shadow-xl px-3 sm:px-3.5">
          {/* Search Icon */}
          <div className="flex items-center justify-center text-muted-foreground mr-2.5 shrink-0">
            <i
              className={`fas fa-search text-sm transition-colors ${
                isFocused ? "text-primary scale-105" : "text-muted-foreground"
              }`}
            />
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setSelectedIndex(-1);
              if (!isFocused) setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar lugares o categorías... (ej. MALBA, Teatros, Café)"
            className="flex-1 bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none focus:ring-0 truncate"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Clear Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                title="Limpiar búsqueda"
                className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <i className="fas fa-xmark text-xs" />
              </button>
            )}

            {/* Category Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowCategoryChips((prev) => !prev)}
              title={showCategoryChips ? "Ocultar categorías" : "Filtrar por categorías"}
              className={`flex items-center gap-1.5 h-7 px-2 sm:px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter !== "TODOS" || showCategoryChips
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <i className="fas fa-sliders text-[11px]" />
              <span className="hidden sm:inline">
                {activeFilter === "TODOS" ? "Categorías" : CATEGORIAS[activeFilter]?.label || "Filtro"}
              </span>
              {activeFilter !== "TODOS" && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Category Chips Row (collapsible or toggleable) */}
        {showCategoryChips && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 px-0.5 no-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              onClick={() => onFilterChange("TODOS")}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm ${
                activeFilter === "TODOS"
                  ? "bg-primary text-primary-foreground font-bold shadow-md scale-[1.02]"
                  : "bg-card/90 backdrop-blur-md text-foreground hover:bg-muted border border-border"
              }`}
            >
              <i className="fas fa-layer-group text-[10px]" />
              <span>Todos ({espacios.length})</span>
            </button>

            {categoryEntries.map(([key, cat]) => {
              const isActive = activeFilter === key;
              const count = espacios.filter((e) => e.cat === key).length;
              return (
                <button
                  key={key}
                  onClick={() => onFilterChange(isActive ? "TODOS" : key)}
                  className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm ${
                    isActive
                      ? "text-white font-bold shadow-md scale-[1.02]"
                      : "bg-card/90 backdrop-blur-md text-foreground hover:bg-muted border border-border"
                  }`}
                  style={{
                    backgroundColor: isActive ? cat.color : undefined,
                  }}
                >
                  <i
                    className={`fas ${cat.icon} text-[10px]`}
                    style={{ color: isActive ? "#ffffff" : cat.color }}
                  />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full ${
                      isActive ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Autocomplete Dropdown Results */}
      {isFocused && normalizedQuery.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 max-h-[380px] bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Results Summary Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/60 bg-muted/30 text-[11px] font-medium text-muted-foreground">
            <span>
              {matchingPlaces.length === 1
                ? "1 espacio encontrado"
                : `${matchingPlaces.length} espacios encontrados`}
            </span>
            {activeFilter !== "TODOS" && (
              <button
                onClick={() => onFilterChange("TODOS")}
                className="text-primary hover:underline font-semibold"
              >
                Ver todas las categorías
              </button>
            )}
          </div>

          {/* Category match suggestion banner */}
          {matchingCategory && (
            <button
              onClick={() => {
                onFilterChange(matchingCategory.key);
                setIsFocused(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-primary/10 hover:bg-primary/15 border-b border-border/60 transition-colors text-left group"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: matchingCategory.color }}
              >
                <i className={`fas ${matchingCategory.icon} text-xs`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Filtrar por categoría:</span>
                  <span className="text-primary font-extrabold">{matchingCategory.label}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Ver todos los {matchingCategory.count} lugares de esta categoría
                </div>
              </div>
              <i className="fas fa-arrow-right text-xs text-primary transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          {/* Matching Places List */}
          <div ref={resultsListRef} className="overflow-y-auto max-h-[290px] divide-y divide-border/30">
            {matchingPlaces.length > 0 ? (
              matchingPlaces.map((place, idx) => {
                const cat = CATEGORIAS[place.cat];
                const hasEvent = placesWithEvents.has(place.n);
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={`${place.n}-${idx}`}
                    onClick={() => handleSelect(place)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 w-full px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    {/* Category Icon Badge */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: cat?.color || "#6b7280" }}
                    >
                      <i className={`fas ${cat?.icon || "fa-landmark"} text-xs`} />
                    </div>

                    {/* Venue Name & Category */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {highlightMatch(place.n, searchQuery)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate font-medium">
                          {cat?.label}
                        </span>
                        {hasEvent && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded-md border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
                            Eventos
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Icon */}
                    <div className="shrink-0 text-muted-foreground group-hover:text-primary pl-2">
                      <i className="fas fa-location-dot text-xs text-muted-foreground/60" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                  <i className="fas fa-magnifying-glass text-sm" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  No se encontraron lugares
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No hay espacios con el nombre o categoría "{searchQuery}"
                </p>
                <button
                  onClick={handleClear}
                  className="mt-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <i className="fas fa-rotate-left text-[10px]" />
                  <span>Limpiar búsqueda</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
