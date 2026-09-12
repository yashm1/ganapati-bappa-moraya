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
  Search,
  Users,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  AttributionControl,
  LngLatBounds,
  setWorkerUrl,
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type CrowdLevel = "Low" | "Moderate" | "High";
type MapColorProperty = "background-color" | "fill-color" | "line-color";

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

export function MapExperience() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [pandals, setPandals] = useState(PANDALS);
  const [selected, setSelected] = useState<Pandal | null>(null);
  const [query, setQuery] = useState("");
  const [ecoOnly, setEcoOnly] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [mapNotice, setMapNotice] = useState("Loading the map...");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [crowdOpen, setCrowdOpen] = useState(false);
  const [uploadLocation, setUploadLocation] = useState<[number, number] | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  useEffect(() => {
    markerRefs.current.forEach(marker => {
      const element = marker.getElement();
      element.setAttribute("aria-pressed", String(element.dataset.pandalId === selected?.id));
    });
  }, [selected]);

  const visiblePandals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return pandals.filter((pandal) => {
      const matchesSearch = `${pandal.name} ${pandal.area}`.toLowerCase().includes(normalized);
      return matchesSearch && (!ecoOnly || pandal.eco) && (!lowOnly || pandal.crowd === "Low");
    });
  }, [ecoOnly, lowOnly, pandals, query]);

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

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [72.836, 18.995],
      zoom: 14.05,
      pitch: 35,
      bearing: 0,
      canvasContextAttributes: { antialias: true },
      attributionControl: false,
      maxPitch: 75,
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    const collapseAttribution = () => {
      map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
    };
    collapseAttribution();
    map.once("idle", collapseAttribution);
    map.on("error", () => setMapNotice("Map unavailable. Check your connection and reload."));

    map.on("load", () => {
      setMapNotice("");
      const mapColorOverrides: Array<{ layer: string; property: MapColorProperty; value: string }> = [
        { layer: "background", property: "background-color", value: "#f8f1e7" },
        { layer: "water", property: "fill-color", value: "#9bd8e8" },
        { layer: "water-intermittent", property: "fill-color", value: "#b7e4ee" },
        { layer: "park", property: "fill-color", value: "#bfe3b5" },
        { layer: "landcover-grass", property: "fill-color", value: "#dcefcf" },
        { layer: "landcover-wood", property: "fill-color", value: "#a9d09e" },
        { layer: "landuse-residential", property: "fill-color", value: "#f3e6d3" },
        { layer: "building", property: "fill-color", value: "#ead9ca" },
        { layer: "building-top", property: "fill-color", value: "#f1e2d4" },
        { layer: "highway-minor", property: "line-color", value: "#fff6df" },
        { layer: "highway-secondary-tertiary", property: "line-color", value: "#f5c27b" },
        { layer: "highway-primary", property: "line-color", value: "#f2a65a" },
        { layer: "highway-motorway", property: "line-color", value: "#ee8452" },
      ];
      mapColorOverrides.forEach(({ layer, property, value }) => {
        if (map.getLayer(layer)) map.setPaintProperty(layer, property, value);
      });

      const sourceName = Object.keys(map.getStyle().sources).find((name) => name.includes("openmaptiles"));
      const firstLabel = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-field"])?.id;

      if (sourceName && !map.getLayer("bappa-3d-buildings")) {
        map.addLayer(
          {
            id: "bappa-3d-buildings",
            source: sourceName,
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 12,
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                "#e8c6ae",
                15.5,
                "#d7a88b",
              ],
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0,
                15,
                ["coalesce", ["get", "render_height"], ["get", "height"], 14],
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                ["get", "min_height"],
                0,
              ],
              "fill-extrusion-opacity": 0.82,
            },
          },
          firstLabel,
        );
      }

      map.addSource("pandals", {
        type: "geojson",
        data: toGeoJson(PANDALS),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 62,
      });

      map.addLayer({
        id: "pandal-clusters",
        type: "circle",
        source: "pandals",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#ef8354", 5, "#f4a261", 10, "#e76f51"],
          "circle-radius": ["step", ["get", "point_count"], 22, 5, 27, 10, 33],
          "circle-stroke-width": 5,
          "circle-stroke-color": "rgba(255,255,255,.92)",
        },
      });

      map.addLayer({
        id: "pandal-cluster-count",
        type: "symbol",
        source: "pandals",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "pandal-singletons",
        type: "circle",
        source: "pandals",
        filter: ["!", ["has", "point_count"]],
        maxzoom: 14,
        paint: {
          "circle-color": "#e76f51",
          "circle-radius": 22,
          "circle-stroke-width": 5,
          "circle-stroke-color": "rgba(255,255,255,.92)",
        },
      });

      map.addLayer({
        id: "pandal-singleton-count",
        type: "symbol",
        source: "pandals",
        filter: ["!", ["has", "point_count"]],
        maxzoom: 14,
        layout: {
          "text-field": "1",
          "text-size": 13,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.on("click", "pandal-clusters", async (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource("pandals") as GeoJSONSource;
        if (clusterId == null) return;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const coordinates = (feature?.geometry as Point).coordinates as [number, number];
        map.easeTo({ center: coordinates, zoom, duration: 700 });
      });

      const syncMarkerVisibility = () => {
        const show = map.getZoom() >= 14;
        markerRefs.current.forEach((marker) => {
          marker.getElement().hidden = !show;
        });
      };

      syncMarkerVisibility();
      map.on("zoom", syncMarkerVisibility);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncPandals = () => {
      const source = map.getSource("pandals") as GeoJSONSource | undefined;
      source?.setData(toGeoJson(visiblePandals));

      markerRefs.current.forEach((marker) => marker.remove());
      const markersVisible = map.getZoom() >= 14;
      markerRefs.current = visiblePandals.map((pandal) => {
        const marker = new Marker({ element: createPhotoMarker(pandal, (item) => {
          setSelected(item);
          setMobileListOpen(false);
          map.easeTo({ center: item.coordinates, zoom: 15.35, pitch: 40, offset: [0, -100], duration: 1000 });
        }), anchor: "bottom" })
          .setLngLat(pandal.coordinates)
          .addTo(map);
        marker.getElement().hidden = !markersVisible;
        return marker;
      });
    };

    if (map.isStyleLoaded()) syncPandals();
    else map.once("load", syncPandals);

    return () => {
      map.off("load", syncPandals);
    };
  }, [visiblePandals]);

  const focusPandal = (pandal: Pandal) => {
    setSelected(pandal);
    setMobileListOpen(false);
    mapRef.current?.easeTo({
      center: pandal.coordinates,
      zoom: 15.35,
      pitch: 40,
      offset: [0, -100],
      duration: 1000,
    });
  };

  const locateUser = () => {
    if (!navigator.geolocation) { setMapNotice("Location is unavailable in this browser."); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setMapNotice("");
      mapRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 900 });
    }, () => setMapNotice("Location access is unavailable. You can still search and explore."), { timeout: 10000 });
  };

  const resetMap = () => {
    setSelected(null);
    setMobileListOpen(false);
    setQuery("");
    setEcoOnly(false);
    setLowOnly(false);
    const bounds = pandals.reduce((result, pandal) => result.extend(pandal.coordinates), new LngLatBounds());
    if (!bounds.isEmpty()) mapRef.current?.fitBounds(bounds, { padding: { top: 150, bottom: 220, left: 55, right: 55 }, maxZoom: 14.05, pitch: 25, duration: 1000 });
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
        mapRef.current?.easeTo({ center: coordinates, zoom: 16, duration: 700 });
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
      const result = (await response.json().catch(() => null)) as { pandal?: Pandal; error?: string } | null;
      if (!response.ok || !result?.pandal) {
        setUploadError(result?.error ?? "We could not add this pandal. Please check the details and try again.");
        return;
      }
      const newPandal = result.pandal;
      setPandals((items) => [newPandal, ...items]);
      setSelected(newPandal);
      setUploadOpen(false);
      setUploadPreview(null);
      setUploadLocation(null);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        confetti({ particleCount: 35, spread: 45, origin: { y: 0.8 }, colors: ["#264e46", "#91b7a3", "#d8c99c"] });
      }

      if (mapRef.current) {
        mapRef.current.easeTo({ center: newPandal.coordinates, zoom: 16, pitch: 62, duration: 800 });
      }
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

        <div className="filter-strip">
          <button className={!ecoOnly && !lowOnly ? "filter-chip active" : "filter-chip"} type="button" onClick={() => { setEcoOnly(false); setLowOnly(false); }}>
            All
          </button>
          <button className={ecoOnly ? "filter-chip eco active" : "filter-chip eco"} type="button" onClick={() => setEcoOnly((value) => !value)}>
            <Leaf size={14} /> Eco-friendly
          </button>
          <button className={lowOnly ? "filter-chip active" : "filter-chip"} type="button" aria-pressed={lowOnly} onClick={() => setLowOnly(value => !value)}>
            <Users size={14} /> Low crowd
          </button>
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
              <button
                className="directions-action"
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.coordinates[1]},${selected.coordinates[0]}`, "_blank")}
              >
                <Navigation size={17} /> Directions <ArrowUpRight size={16} />
              </button>
              <button className="crowd-action" type="button" onClick={() => setCrowdOpen(true)}>Update crowd</button>
            </div>
          </div>
        </section>
      )}

      <button className="mobile-add" type="button" aria-label="Add a pandal" onClick={() => { setUploadError(null); setUploadOpen(true); }}>
        <Camera size={20} /> <span>Add pandal</span>
      </button>

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

function createPhotoMarker(pandal: Pandal, onSelect: (pandal: Pandal) => void) {
  const markerButton = document.createElement("button");
  markerButton.className = "photo-marker";
  markerButton.type = "button";
  markerButton.dataset.pandalId = pandal.id;
  markerButton.title = pandal.name;
  markerButton.setAttribute("aria-label", `Open ${pandal.name}`);
  markerButton.style.setProperty("--marker-image", `url(${pandal.image})`);
  markerButton.innerHTML = pandal.eco ? '<span class="marker-eco">*</span>' : "";
  markerButton.addEventListener("click", () => onSelect(pandal));
  return markerButton;
}


function toGeoJson(pandals: Pandal[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: pandals.map((pandal) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: pandal.coordinates },
      properties: { id: pandal.id, name: pandal.name },
    })),
  };
}