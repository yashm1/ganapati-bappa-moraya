"use client";

import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  Leaf,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import confetti from "canvas-confetti";
import { useEffect, useMemo, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/google-maps.mjs";
import { installMapResumeHandler } from "@/lib/map-resume.mjs";

type CrowdLevel = "Low" | "Moderate" | "High";

type MapPosition = { lat: number; lng: number };
type GoogleMapInstance = {
  fitBounds: (bounds: GoogleBounds, padding?: unknown) => void;
  getZoom: () => number | undefined;
  panTo: (position: MapPosition) => void;
  setCenter: (position: MapPosition) => void;
  setZoom: (zoom: number) => void;
  addListener?: (event: string, handler: () => void) => { remove: () => void };
  setOptions?: (options: Record<string, unknown>) => void;
};
type GoogleMarkerInstance = {
  addListener: (event: string, handler: () => void) => { remove: () => void };
  setMap: (map: GoogleMapInstance | null) => void;
};
type GoogleBounds = {
  extend: (position: MapPosition) => GoogleBounds;
  isEmpty: () => boolean;
};
type GoogleMapsApi = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  LatLngBounds: new () => GoogleBounds;
  Point: new (x: number, y: number) => unknown;
  Size: new (width: number, height: number) => unknown;
  event: { trigger: (target: GoogleMapInstance, event: string) => void };
};
type DisposableMarkerClusterer = MarkerClusterer & { setMap: (map: null) => void };

type Pandal = {
  id: string;
  name: string;
  area: string;
  coordinates: [number, number];
  image: string;
  crowd: CrowdLevel;
  wait: string;
  eco: boolean;
  distance: string;
  description: string;
};

const PANDALS: Pandal[] = [
  {
    id: "lalbaugcha-raja",
    name: "Lalbaugcha Raja",
    area: "Lalbaug",
    coordinates: [72.8364, 18.9902],
    image: "/pandals/lalbaug.jpg",
    crowd: "High",
    wait: "80-100 min",
    eco: false,
    distance: "1.2 km",
    description: "Mumbai's iconic wish-fulfilling Ganapati, celebrated since 1934.",
  },
  {
    id: "gsb-seva",
    name: "GSB Seva Mandal",
    area: "King's Circle",
    coordinates: [72.8555, 19.0261],
    image: "/pandals/gsb.jpg",
    crowd: "Moderate",
    wait: "25-35 min",
    eco: true,
    distance: "4.3 km",
    description: "A richly decorated celebration known for traditional rituals and music.",
  },
  {
    id: "chinchpokli-chintamani",
    name: "Chinchpoklicha Chintamani",
    area: "Chinchpokli",
    coordinates: [72.8336, 18.9878],
    image: "/pandals/chintamani.jpg",
    crowd: "Moderate",
    wait: "35-45 min",
    eco: false,
    distance: "1.6 km",
    description: "A beloved neighbourhood mandal with more than a century of history.",
  },
  {
    id: "mumbai-cha-raja",
    name: "Mumbai Cha Raja",
    area: "Ganesh Galli",
    coordinates: [72.8384, 18.9917],
    image: "/pandals/ganesh-galli.jpg",
    crowd: "Low",
    wait: "10-15 min",
    eco: true,
    distance: "1.4 km",
    description: "Known for immersive themes and detailed sets built afresh every year.",
  },
  {
    id: "khetwadi-11",
    name: "Khetwadi 11th Lane",
    area: "Girgaon",
    coordinates: [72.8173, 18.9611],
    image: "/pandals/eco.jpg",
    crowd: "Low",
    wait: "5-10 min",
    eco: true,
    distance: "2.9 km",
    description: "A lane-by-lane celebration with elaborate decor and a warm local feel.",
  },
  {
    id: "fort-cha-raja",
    name: "Fort Cha Raja",
    area: "Fort",
    coordinates: [72.8347, 18.9349],
    image: "/pandals/chintamani.jpg",
    crowd: "Low",
    wait: "10-15 min",
    eco: false,
    distance: "5.8 km",
    description: "A central-city stop surrounded by Mumbai's historic business district.",
  },
  {
    id: "andhericha-raja",
    name: "Andhericha Raja",
    area: "Andheri West",
    coordinates: [72.8402, 19.1301],
    image: "/pandals/ganesh-galli.jpg",
    crowd: "High",
    wait: "55-70 min",
    eco: false,
    distance: "12.6 km",
    description: "The western suburbs' landmark mandal, famous for striking annual themes.",
  },
];

const crowdClass: Record<CrowdLevel, string> = {
  Low: "crowd-low",
  Moderate: "crowd-moderate",
  High: "crowd-high",
};

const GOOGLE_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f7ead7" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4e3d50" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fffaf1" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d6b9a5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f4d9e7" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#a9dda0" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#356b4a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#fff8dd" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffd08a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f7a66a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e78758" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#b886bd" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#f4bd55" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#78d1df" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#246b78" }] },
];

const MUMBAI_CENTER: MapPosition = { lat: 18.995, lng: 72.836 };

const INDIA_BOUNDS = { north: 35.5, south: 6.5, west: 68.0, east: 97.5 };

function isInsideIndia(lat: number, lng: number): boolean {
  return lat >= INDIA_BOUNDS.south && lat <= INDIA_BOUNDS.north &&
    lng >= INDIA_BOUNDS.west && lng <= INDIA_BOUNDS.east;
}

const CLUSTER_MARKER_ICON = toSvgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="21" fill="#fff" stroke="#fff" stroke-width="5" />
    <circle cx="24" cy="24" r="19" fill="#352f39" />
    <circle cx="24" cy="24" r="16" fill="none" stroke="#f18a38" stroke-width="1.5" stroke-dasharray="3 3" />
  </svg>
`);

export function MapExperience() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const mapsApiRef = useRef<GoogleMapsApi | null>(null);
  const mapInteractionRef = useRef(false);
  const markerRefs = useRef<GoogleMarkerInstance[]>([]);
  const markerClusterRef = useRef<DisposableMarkerClusterer | null>(null);
  const [pandals, setPandals] = useState(PANDALS);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<Pandal | null>(null);
  const [query, setQuery] = useState("");
  const [ecoOnly, setEcoOnly] = useState(false);
  const [crowdFilter, setCrowdFilter] = useState<string>("All");
  const [selectedArea, setSelectedArea] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("default");
  const [mapNotice, setMapNotice] = useState("Loading the map...");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [crowdOpen, setCrowdOpen] = useState(false);
  const [uploadLocation, setUploadLocation] = useState<[number, number] | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setCompactViewport(viewport.matches);
    updateViewport();
    viewport.addEventListener("change", updateViewport);
    return () => viewport.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!uploadOpen && !crowdOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUploadOpen(false);
        setCrowdOpen(false);
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [uploadOpen, crowdOpen]);

  useEffect(() => () => { if (uploadPreview) URL.revokeObjectURL(uploadPreview); }, [uploadPreview]);

  const uniqueAreas = useMemo(() => {
    const areas = pandals.map((p) => p.area).filter(Boolean);
    return Array.from(new Set(areas)).sort();
  }, [pandals]);

  const visiblePandals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let filtered = pandals.filter((pandal) => {
      const matchesSearch = `${pandal.name} ${pandal.area}`.toLowerCase().includes(normalized);
      const matchesEco = !ecoOnly || pandal.eco;
      const matchesCrowd = crowdFilter === "All" || pandal.crowd === crowdFilter;
      const matchesArea = selectedArea === "All" || pandal.area === selectedArea;
      return matchesSearch && matchesEco && matchesCrowd && matchesArea;
    });

    if (sortBy === "crowd") {
      const order: Record<CrowdLevel, number> = { Low: 1, Moderate: 2, High: 3 };
      filtered = [...filtered].sort((a, b) => order[a.crowd] - order[b.crowd]);
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [crowdFilter, ecoOnly, pandals, query, selectedArea, sortBy]);

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== "" || ecoOnly || crowdFilter !== "All" || selectedArea !== "All" || sortBy !== "default";
  }, [query, ecoOnly, crowdFilter, selectedArea, sortBy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (ecoOnly) count++;
    if (crowdFilter !== "All") count++;
    if (selectedArea !== "All") count++;
    if (sortBy !== "default") count++;
    return count;
  }, [query, ecoOnly, crowdFilter, selectedArea, sortBy]);

  const clearFilters = () => {
    setQuery("");
    setEcoOnly(false);
    setCrowdFilter("All");
    setSelectedArea("All");
    setSortBy("default");
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pandals")
      .then(async (response) => (await response.json()) as { pandals?: Pandal[] })
      .then((result) => {
        if (cancelled || !result.pandals?.length) return;
        setPandals((current) => {
          const combined = [...result.pandals!, ...current];
          return combined.filter((pandal, index) => combined.findIndex((item) => item.id === pandal.id) === index);
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    let cancelled = false;
    let cleanupMapResume: () => void = () => undefined;
    let cleanupMapInteraction: () => void = () => undefined;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    loadGoogleMaps(apiKey ?? "", window)
      .then((maps: GoogleMapsApi) => {
        if (cancelled || !mapContainer.current) return;

        const map = new maps.Map(mapContainer.current, {
          backgroundColor: "#f7ead7",
          center: MUMBAI_CENTER,
          clickableIcons: false,
          controlSize: 32,
          fullscreenControl: false,
          gestureHandling: "greedy",
          mapTypeControl: false,
          styles: GOOGLE_MAP_STYLES,
          streetViewControl: false,
          zoom: 14,
          zoomControl: !window.matchMedia("(max-width: 767px)").matches,
        });

        mapRef.current = map;
        mapsApiRef.current = maps;
        mapInteractionRef.current = false;
        const interactionListeners = ["click", "dragstart", "zoom_changed"]
          .map((event) => map.addListener?.(event, () => { mapInteractionRef.current = true; }))
          .filter((listener): listener is { remove: () => void } => Boolean(listener));
        cleanupMapInteraction = () => interactionListeners.forEach((listener) => listener.remove());
        cleanupMapResume = installMapResumeHandler(() => maps.event.trigger(map, "resize"));
        setMapNotice("");
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapNotice("Map unavailable. Check the Google Maps API key and reload.");
      });

    return () => {
      cancelled = true;
      cleanupMapInteraction();
      cleanupMapResume();
      markerClusterRef.current?.clearMarkers();
      markerClusterRef.current?.setMap(null);
      markerClusterRef.current = null;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
      mapRef.current = null;
      mapsApiRef.current = null;
      setMapReady(false);
    };
  }, []);

  // --- IP-based geolocation: center map on user's approximate location ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5000);

    fetch("https://ipapi.co/json/", { signal: abortController.signal })
      .then(async (response) => {
        const data = await response.json() as { latitude?: number; longitude?: number; country_code?: string };
        clearTimeout(timeout);
        if (abortController.signal.aborted) return;

        const lat = data.latitude;
        const lng = data.longitude;

        if (!mapInteractionRef.current && lat != null && lng != null && isInsideIndia(lat, lng)) {
          map.panTo({ lat, lng });
          map.setZoom(13);
        }
        // If outside India or missing coords → stay on Mumbai (already the default center)
      })
      .catch(() => {
        clearTimeout(timeout);
        // Silently fall back to Mumbai — no disruption
      });

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [mapReady]);

  // --- Sync markers & clusters whenever pandals or viewport change ---
  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps || !mapReady) return;

    const syncPandals = () => {
      markerClusterRef.current?.clearMarkers();
      markerClusterRef.current?.setMap(null);
      markerClusterRef.current = null;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      const markers = visiblePandals.map((pandal) => {
        const marker = createGoogleMarker(pandal, maps, compactViewport, (item) => {
          setSelected(item);
          setMobileListOpen(false);
          map.panTo(toMapPosition(item.coordinates));
          map.setZoom(15);
        });
        return marker;
      });
      markerRefs.current = markers;
      markerClusterRef.current = new MarkerClusterer({
        algorithm: new SuperClusterAlgorithm({
          maxZoom: 17,
          radius: compactViewport ? 100 : 90,
          minPoints: 2,
        }),
        map: map as never,
        markers: markers as never[],
        onClusterClick: (_event: unknown, cluster: { position: MapPosition; count: number; bounds?: GoogleBounds }) => {
          if (cluster.bounds && !cluster.bounds.isEmpty()) {
            map.fitBounds(cluster.bounds, { top: 80, bottom: 120, left: 40, right: 40 });
          } else {
            map.panTo(cluster.position);
            const currentZoom = map.getZoom() ?? 14;
            map.setZoom(Math.min(currentZoom + 2, 18));
          }
        },
        renderer: {
          render: ({ count, position }) => {
            const clusterSize = compactViewport ? 42 : 46;
            return new maps.Marker({
              icon: {
                anchor: new maps.Point(clusterSize / 2, clusterSize / 2),
                scaledSize: new maps.Size(clusterSize, clusterSize),
                url: CLUSTER_MARKER_ICON,
              },
              label: {
                color: "#fff",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                fontWeight: "700",
                text: String(count),
              },
              optimized: true,
              position,
              title: `${count} pandals nearby`,
              zIndex: 1000 + count,
            }) as never;
          },
        },
      }) as DisposableMarkerClusterer;
    };

    syncPandals();
  }, [compactViewport, mapReady, visiblePandals]);

  const focusPandal = (pandal: Pandal) => {
    setSelected(pandal);
    setMobileListOpen(false);
    const map = mapRef.current;
    if (!map) return;
    const targetPos = toMapPosition(pandal.coordinates);
    if (map.setOptions) {
      map.setOptions({
        padding: compactViewport
          ? { top: 60, bottom: 250, left: 16, right: 16 }
          : { top: 90, bottom: 30, left: 380, right: 30 },
      });
    }
    map.panTo(targetPos);
    const currentZoom = map.getZoom() ?? 14;
    if (currentZoom < 15) {
      map.setZoom(15);
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) { setMapNotice("Location is unavailable in this browser."); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setMapNotice("");
      mapRef.current?.panTo({ lat: coords.latitude, lng: coords.longitude });
      mapRef.current?.setZoom(15);
    }, () => setMapNotice("Location access is unavailable. You can still search and explore."), { timeout: 10000 });
  };

  const resetMap = () => {
    setSelected(null);
    setMobileListOpen(false);
    clearFilters();
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    if (!map || !maps) return;
    if (map.setOptions) {
      map.setOptions({ padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    }
    const bounds = pandals.reduce(
      (result, pandal) => result.extend(toMapPosition(pandal.coordinates)),
      new maps.LatLngBounds(),
    );
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 150, bottom: 220, left: 55, right: 55 });
      window.setTimeout(() => {
        if ((map.getZoom() ?? 0) > 14) map.setZoom(14);
      }, 250);
    }
  };

  const captureUploadLocation = () => {
    setUploadError(null);
    if (!navigator.geolocation) {
      setUploadError("Location is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates: [number, number] = [coords.longitude, coords.latitude];
        setUploadLocation(coordinates);
        mapRef.current?.panTo(toMapPosition(coordinates));
        mapRef.current?.setZoom(16);
      },
      () => setUploadError("We could not access your location. Allow location access and try again."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submitCrowd = async (level: CrowdLevel) => {
    if (!selected) return;
    const updated = { ...selected, crowd: level };
    setSelected(updated);
    setPandals((items) => items.map((item) => (item.id === selected.id ? updated : item)));
    setCrowdOpen(false);
    await fetch("/api/crowd", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pandalId: selected.id, level }),
    }).catch(() => undefined);
  };

  const submitPandal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (uploadLocation) {
      formData.set("longitude", String(uploadLocation[0]));
      formData.set("latitude", String(uploadLocation[1]));
    }
    setUploading(true);
    setUploadError(null);

    try {
      const response = await fetch("/api/pandals", { method: "POST", body: formData });
      const result = (await response.json().catch(() => null)) as { pandal?: Pandal; status?: string; error?: string } | null;
      if (!response.ok || !result?.pandal) {
        setUploadError(result?.error ?? `We could not add this pandal (error ${response.status}). Please try again.`);
        return;
      }
      const newPandal = result.pandal;
      if (result.status === "pending") {
        setUploadOpen(false);
        setUploadPreview(null);
        setUploadLocation(null);
        setMapNotice("Thanks! Your pandal is waiting for approval before it appears on the map.");
        form.reset();
        return;
      }
      setPandals((items) => [newPandal, ...items]);
      setSelected(newPandal);
      setUploadOpen(false);
      setUploadPreview(null);
      setUploadLocation(null);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        confetti({ particleCount: 35, spread: 45, origin: { y: 0.8 }, colors: ["#f97316", "#db2777", "#0f9f91", "#f7c948"] });
      }

      mapRef.current?.panTo(toMapPosition(newPandal.coordinates));
      mapRef.current?.setZoom(16);
      form.reset();
    } catch {
      setUploadError("The upload could not reach the server. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className={`app-shell ${selected ? "has-selection" : ""} ${mobileListOpen ? "has-directory-open" : ""}`}>
      <div ref={mapContainer} className="map-canvas" aria-label="Interactive community map of Ganapati pandals" />
      <div className="map-wash" aria-hidden="true" />
      {mapNotice && <p className="map-notice" role="status">{mapNotice}</p>}

      <header className="topbar">
        <button className="brand" type="button" aria-label="Bappa Map home" onClick={resetMap}>
          <span className="brand-symbol">ग</span>
          <span>
            <strong>Bappa Map</strong>
            <small>A community of discoveries</small>
          </span>
        </button>

        <label className="map-search">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setMobileListOpen(true); setSelected(null); }}
            placeholder="Find a pandal or neighbourhood"
            aria-label="Search pandals"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="top-actions">
          <button className="icon-control" type="button" aria-label="Locate me" onClick={locateUser}>
            <LocateFixed size={19} />
          </button>
          <button className="primary-action" type="button" onClick={() => { setUploadError(null); setUploadOpen(true); }}>
            <Camera size={18} />
            <span>Add pandal</span>
          </button>
        </div>
      </header>

      <aside className={`directory ${mobileListOpen ? "directory-open" : ""}`} aria-label="Pandal directory" inert={!mobileListOpen}>
        <div className="directory-handle" aria-hidden="true" />
        <div className="directory-heading">
          <div>
            <span className="eyebrow">{visiblePandals.length} community discoveries</span>
            <h1>Explore pandals</h1>
          </div>
          <button className="close-mobile" type="button" onClick={() => setMobileListOpen(false)} aria-label="Close list">
            <X size={20} />
          </button>
        </div>

        <div className="filter-strip" role="region" aria-label="Filter pandals">
          <button
            className={!hasActiveFilters ? "filter-chip active" : "filter-chip"}
            type="button"
            onClick={clearFilters}
          >
            All ({pandals.length})
          </button>

          <button
            className={ecoOnly ? "filter-chip eco active" : "filter-chip eco"}
            type="button"
            aria-pressed={ecoOnly}
            onClick={() => setEcoOnly((value) => !value)}
          >
            <Leaf size={14} aria-hidden="true" /> Eco-friendly
          </button>

          <div className="filter-select-wrapper">
            <select
              className={crowdFilter !== "All" ? "filter-select active" : "filter-select"}
              value={crowdFilter}
              onChange={(e) => setCrowdFilter(e.target.value)}
              aria-label="Filter by crowd level"
            >
              <option value="All">Crowd: All</option>
              <option value="Low">Low crowd</option>
              <option value="Moderate">Moderate crowd</option>
              <option value="High">High crowd</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              className={selectedArea !== "All" ? "filter-select active" : "filter-select"}
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              aria-label="Filter by area"
            >
              <option value="All">Area: All</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              className={sortBy !== "default" ? "filter-select active" : "filter-select"}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort pandals"
            >
              <option value="default">Sort: Recommended</option>
              <option value="crowd">Sort: Crowd (Low first)</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              className="filter-chip clear-chip"
              type="button"
              onClick={clearFilters}
              aria-label="Clear all filters"
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="directory-list">
          {visiblePandals.map((pandal) => (
            <button
              className={`directory-item ${selected?.id === pandal.id ? "selected" : ""}`}
              type="button"
              key={pandal.id}
              onClick={() => focusPandal(pandal)}
            >
              <img src={pandal.image} alt="" />
              <span className="item-copy">
                <strong>{pandal.name}</strong>
                <small>{pandal.area}</small>
                <span className={`crowd-label ${crowdClass[pandal.crowd]}`}>
                  <i /> {pandal.crowd} crowd
                </span>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
          {visiblePandals.length === 0 && <p className="empty-state">No pandals match that search yet.</p>}
        </div>
      </aside>

      <nav className="mobile-action-dock" aria-label="Map actions">
        <button
          className="mobile-map-action"
          type="button"
          onClick={() => { setMobileListOpen(true); setSelected(null); }}
          aria-expanded={mobileListOpen}
        >
          <MapIcon size={18} />
          <span>Explore</span>
          <b>{visiblePandals.length}</b>
        </button>
        <button className="mobile-map-action" type="button" onClick={locateUser}>
          <LocateFixed size={18} />
          <span>Near me</span>
        </button>
        <button className="mobile-map-action mobile-map-action-primary" type="button" onClick={() => { setUploadError(null); setUploadOpen(true); }}>
          <Camera size={18} />
          <span>Add</span>
        </button>
      </nav>

      <button
        type="button"
        className="browse-launcher"
        onClick={() => { setMobileListOpen(true); setSelected(null); }}
        aria-label="Browse all pandals"
        aria-expanded={mobileListOpen}
      >
        <MapIcon size={18} />
        <span>Browse pandals</span>
        <span className="browse-count">{visiblePandals.length}</span>
      </button>

      <button className="locate-mobile" type="button" onClick={locateUser} aria-label="Locate me">
        <Compass size={20} />
      </button>

      {selected && (
        <section className="detail-card" aria-live="polite">
          <button className="detail-close" type="button" onClick={() => setSelected(null)} aria-label="Close details">
            <X size={18} />
          </button>
          <div className="detail-image-wrap">
            <img src={selected.image} alt={`${selected.name} Ganapati`} />
            {selected.eco && <span className="eco-badge"><Leaf size={13} /> Eco-friendly</span>}
          </div>
          <div className="detail-content">
            <span className="detail-kicker">{selected.area}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="detail-stats">
              <span><Users size={15} /> <b className={crowdClass[selected.crowd]}>{selected.crowd}</b> crowd</span>
              <span><Clock3 size={15} /> {selected.wait}</span>
            </div>
            <div className="detail-actions">
              <a
                className="directions-action"
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.coordinates[1]},${selected.coordinates[0]}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={17} /> Directions <ArrowUpRight size={16} />
              </a>
              <button className="crowd-action" type="button" onClick={() => setCrowdOpen(true)}>Update crowd</button>
            </div>
          </div>
        </section>
      )}

      {crowdOpen && selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCrowdOpen(false);
        }}>
          <section className="crowd-modal" role="dialog" aria-modal="true" aria-labelledby="crowd-title">
            <button className="modal-close" type="button" onClick={() => setCrowdOpen(false)} aria-label="Close crowd update"><X size={19} /></button>
            <span className="modal-icon"><Users size={20} /></span>
            <p className="modal-eyebrow">Live community update</p>
            <h2 id="crowd-title">How crowded is it now?</h2>
            <p>Your report for {selected.name} helps people nearby plan their visit.</p>
            <div className="crowd-options">
              {(["Low", "Moderate", "High"] as CrowdLevel[]).map((level) => (
                <button key={level} type="button" className={crowdClass[level]} onClick={() => submitCrowd(level)}>
                  <i />
                  <strong>{level}</strong>
                  <span>{level === "Low" ? "Walk right in" : level === "Moderate" ? "Some waiting" : "Long queue"}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {uploadOpen && (
        <div className="modal-backdrop upload-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setUploadOpen(false);
        }}>
          <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <button className="modal-close" type="button" onClick={() => setUploadOpen(false)} aria-label="Close upload"><X size={19} /></button>
            <div className="upload-heading">
              <span className="modal-icon"><Camera size={20} /></span>
              <div>
                <p className="modal-eyebrow">Community contribution</p>
                <h2 id="upload-title">Add a pandal to the map</h2>
              </div>
            </div>
            <form onSubmit={submitPandal}>
              <label className={`photo-drop ${uploadPreview ? "has-preview" : ""}`}>
                {uploadPreview ? <img src={uploadPreview} alt="Selected pandal preview" /> : <><Camera size={26} /><strong>Add a clear photo</strong><span>Tap to use your camera or photo library</span></>}
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setUploadPreview(URL.createObjectURL(file));
                  }}
                />
              </label>

              <div className="field-grid">
                <label className="form-field">
                  <span>Pandal name</span>
                  <input name="name" required placeholder="e.g. Dadar Cha Vighnaharta" />
                </label>
                <label className="form-field">
                  <span>Neighbourhood</span>
                  <input name="area" required placeholder="e.g. Dadar West" />
                </label>
              </div>

              <button className={`location-capture ${uploadLocation ? "captured" : ""}`} type="button" onClick={captureUploadLocation}>
                {uploadLocation ? <Check size={18} /> : <MapPin size={18} />}
                <span><strong>{uploadLocation ? "Location captured" : "Use my current location"}</strong><small>{uploadLocation ? "The new pin is ready" : "Used only to place this pandal"}</small></span>
              </button>

              <div className="upload-options">
                <label className="eco-toggle">
                  <input type="checkbox" name="eco" value="true" />
                  <span><Leaf size={17} /><b>Eco-friendly idol</b><small>Shadu mati or natural materials</small></span>
                </label>
                <label className="form-field compact-field">
                  <span>Crowd right now</span>
                  <select name="crowd" defaultValue="Moderate">
                    <option>Low</option>
                    <option>Moderate</option>
                    <option>High</option>
                  </select>
                </label>
              </div>

              {uploadError && (
                <p className="upload-error" role="alert">
                  <CircleAlert size={16} />
                  <span>{uploadError}</span>
                </p>
              )}

              <button className="submit-pandal" type="submit" disabled={!uploadLocation || uploading}>
                {uploading ? "Adding to the map..." : <><Plus size={18} /> Add pandal</>}
              </button>
              <p className="moderation-note">Share a photo you took. Your contribution helps others discover this pandal.</p>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function toMapPosition(coordinates: [number, number]): MapPosition {
  return { lat: coordinates[1], lng: coordinates[0] };
}

function createGoogleMarker(
  pandal: Pandal,
  maps: GoogleMapsApi,
  compactViewport: boolean,
  onSelect: (pandal: Pandal) => void,
) {
  // Keep photo markers noticeably lighter than cluster badges so they do not
  // overpower the map on a compact screen.
  const markerSize = compactViewport ? 28 : 34;
  const marker = new maps.Marker({
    icon: {
      anchor: new maps.Point(markerSize / 2, markerSize),
      // Declare the image origin as well as its anchor so Google Maps does
      // not infer sprite geometry again while tiles are being refreshed.
      origin: new maps.Point(0, 0),
      scaledSize: new maps.Size(markerSize, markerSize),
      url: pandal.image,
    },
    optimized: true,
    position: toMapPosition(pandal.coordinates),
    title: pandal.name,
  });
  marker.addListener("click", () => onSelect(pandal));
  return marker;
}

function toSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}
