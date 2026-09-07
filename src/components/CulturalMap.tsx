import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createRoot } from "react-dom/client";
import { espacios, CATEGORIAS, CategoryKey } from "@/data/espacios";
import { supabase } from "@/integrations/supabase/client";
import MapLegend from "./MapLegend";
import MapPopup from "./MapPopup";
import PhotoGalleryModal from "./PhotoGalleryModal";
import EventosPopup from "./EventosPopup";
import AgendaCulturalModal from "./AgendaCulturalModal";
import AdminPasswordModal from "./AdminPasswordModal";
import AdminSyncModal from "./AdminSyncModal";

const CulturalMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  const [activeFilter, setActiveFilter] = useState<CategoryKey | "TODOS">("TODOS");
  const [galleryPlace, setGalleryPlace] = useState<string | null>(null);
  const [galleryColor, setGalleryColor] = useState("#333");
  const [eventosPlace, setEventosPlace] = useState<string | null>(null);
  const [eventosColor, setEventosColor] = useState("#333");
  const [isDark, setIsDark] = useState(false);
  const [placesWithEvents, setPlacesWithEvents] = useState<Set<string>>(new Set());

  // Agenda & Admin modals
  const [showAgenda, setShowAgenda] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showAdminSync, setShowAdminSync] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const lightTilesRef = useRef<L.TileLayer | null>(null);
  const darkTilesRef = useRef<L.TileLayer | null>(null);

  // Initialize admin status from localStorage or URL
  useEffect(() => {
    try {
      const saved = localStorage.getItem("radar_admin_access");
      const urlParams = new URLSearchParams(window.location.search);
      if (saved === "true" || urlParams.get("admin") === "2026") {
        setIsAdmin(true);
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setShowAdminPin(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogoutAdmin = () => {
    try {
      localStorage.removeItem("radar_admin_access");
    } catch {}
    setIsAdmin(false);
    setShowAdminSync(false);
  };

  // Fetch places that have approved events
  useEffect(() => {
    const fetchPlacesWithEvents = async () => {
      try {
        const { data } = await supabase
          .from("eventos")
          .select("lugar")
          .eq("estado", "aprobado");
        if (data) {
          setPlacesWithEvents(new Set(data.map((e: { lugar: string }) => e.lugar)));
        }
      } catch (err) {
        console.error("Error fetching places with events:", err);
      }
    };
    fetchPlacesWithEvents();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-34.6037, -58.3816], 13);
    mapRef.current = map;

    lightTilesRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    ).addTo(map);

    darkTilesRef.current = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    );

    markersGroupRef.current.addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const createIcon = useCallback((color: string, faIcon: string, hasEvent: boolean) => {
    const eventClass = hasEvent ? " has-event" : "";
    return L.divIcon({
      className: "custom-div-icon",
      html: `<div class="custom-pin${eventClass}" style="background:${color};color:${color}"><i class="fas ${faIcon}"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, []);

  // Update markers when filter or events change
  useEffect(() => {
    const group = markersGroupRef.current;
    group.clearLayers();
    markersMapRef.current.clear();

    espacios.forEach((lugar) => {
      if (activeFilter !== "TODOS" && lugar.cat !== activeFilter) return;

      const cat = CATEGORIAS[lugar.cat];
      const hasEvent = placesWithEvents.has(lugar.n);
      const icon = createIcon(cat.color, cat.icon, hasEvent);
      const marker = L.marker(lugar.c, { icon });

      const popupDiv = document.createElement("div");
      const root = createRoot(popupDiv);
      root.render(
        <MapPopup
          nombre={lugar.n}
          color={cat.color}
          hasEvent={hasEvent}
          onOpenGallery={() => {
            setGalleryPlace(lugar.n);
            setGalleryColor(cat.color);
            mapRef.current?.closePopup();
          }}
          onOpenEventos={() => {
            setEventosPlace(lugar.n);
            setEventosColor(cat.color);
            mapRef.current?.closePopup();
          }}
        />
      );

      marker.bindPopup(popupDiv);
      group.addLayer(marker);
      markersMapRef.current.set(lugar.n.toLowerCase(), marker);
    });
  }, [activeFilter, createIcon, placesWithEvents]);

  const handleLocateMe = () => {
    mapRef.current?.locate({ setView: true, maxZoom: 16 });
  };

  const toggleDarkMode = () => {
    const map = mapRef.current;
    if (!map) return;
    if (isDark) {
      if (darkTilesRef.current) map.removeLayer(darkTilesRef.current);
      if (lightTilesRef.current) lightTilesRef.current.addTo(map);
    } else {
      if (lightTilesRef.current) map.removeLayer(lightTilesRef.current);
      if (darkTilesRef.current) darkTilesRef.current.addTo(map);
    }
    setIsDark(!isDark);
  };

  const handleSelectPlaceFromAgenda = (placeName: string) => {
    const found = espacios.find(
      (e) =>
        e.n.toLowerCase() === placeName.toLowerCase() ||
        e.n.toLowerCase().includes(placeName.toLowerCase()) ||
        placeName.toLowerCase().includes(e.n.toLowerCase())
    );

    if (found && mapRef.current) {
      mapRef.current.flyTo(found.c, 16, { duration: 1.2 });
      const cat = CATEGORIAS[found.cat];
      setEventosPlace(found.n);
      setEventosColor(cat.color);
    }
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainerRef} className="w-full h-full" />

      <MapLegend
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdminSync(true)}
        onSecretTrigger={() => setShowAdminPin(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Floating controls */}
      <div className="absolute bottom-8 right-5 flex flex-col gap-3 z-[1000]">
        <button
          onClick={toggleDarkMode}
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <i className={`fas ${isDark ? "fa-sun" : "fa-moon"}`} />
        </button>

        <button
          onClick={handleLocateMe}
          title="Mi ubicación"
          className="w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <i className="fas fa-location-arrow" />
        </button>

        <button
          onClick={() => setShowAgenda(true)}
          title="Agenda Cultural"
          className="w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground text-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <i className="fas fa-calendar-days text-purple-600 dark:text-purple-400" />
        </button>

        {isAdmin && (
          <button
            onClick={() => setShowAdminSync(true)}
            title="Panel de Administración y Sincronización"
            className="w-12 h-12 rounded-full bg-card border border-purple-500 shadow-lg flex items-center justify-center text-foreground text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer relative animate-in fade-in"
          >
            <i className="fas fa-gear text-purple-600 dark:text-purple-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
          </button>
        )}
      </div>

      {galleryPlace && (
        <PhotoGalleryModal
          lugar={galleryPlace}
          color={galleryColor}
          onClose={() => setGalleryPlace(null)}
        />
      )}

      {eventosPlace && (
        <EventosPopup
          lugar={eventosPlace}
          color={eventosColor}
          onClose={() => setEventosPlace(null)}
        />
      )}

      {showAgenda && (
        <AgendaCulturalModal
          onClose={() => setShowAgenda(false)}
          onSelectPlace={handleSelectPlaceFromAgenda}
        />
      )}

      {showAdminPin && (
        <AdminPasswordModal
          onClose={() => setShowAdminPin(false)}
          onSuccess={() => {
            setIsAdmin(true);
            setShowAdminPin(false);
            setShowAdminSync(true);
          }}
        />
      )}

      {showAdminSync && (
        <AdminSyncModal
          onClose={() => setShowAdminSync(false)}
          onLogoutAdmin={handleLogoutAdmin}
        />
      )}
    </div>
  );
};

export default CulturalMap;
