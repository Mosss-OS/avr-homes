import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LocationPickerProps {
  lat: string;
  lng: string;
  area: number;
  propertyType: string;
  address?: string;
  city?: string;
  community?: string;
  onLatChange: (v: string) => void;
  onLngChange: (v: string) => void;
}

function loadLeafletCSS() {
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
}

function loadLeafletJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).L) return resolve((window as any).L);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => {
      const L = (window as any).L;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      resolve(L);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function LocationPicker({ lat, lng, area, propertyType, address, city, community, onLatChange, onLngChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: string; lon: string; display_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const latNum = parseFloat(lat) || 6.45;
  const lngNum = parseFloat(lng) || 3.42;
  const isLand = propertyType === "land";
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const geoTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current || mapInstanceRef.current) return;

    loadLeafletCSS();
    const el = mapRef.current;
    let destroyed = false;

    loadLeafletJS().then((L) => {
      if (destroyed) return;

      const map = L.map(el, {
        center: [latNum, lngNum],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([latNum, lngNum], { draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onLatChange(pos.lat.toFixed(6));
        onLngChange(pos.lng.toFixed(6));
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onLatChange(e.latlng.lat.toFixed(6));
        onLngChange(e.latlng.lng.toFixed(6));
        map.setView(e.latlng, map.getZoom());
      });

      map.whenReady(() => {
        setTimeout(() => map.invalidateSize(), 50);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      if (isLand && area > 0) {
        const side = Math.sqrt(area);
        const half = side / 2;
        const latPerMeter = 1 / 111320;
        const lngPerMeter = 1 / (111320 * Math.cos((latNum * Math.PI) / 180));
        const dLat = half * latPerMeter;
        const dLng = half * lngPerMeter;
        const corners = [
          [latNum - dLat, lngNum - dLng],
          [latNum - dLat, lngNum + dLng],
          [latNum + dLat, lngNum + dLng],
          [latNum + dLat, lngNum - dLng],
        ];
        const poly = L.polygon(corners, {
          color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.2, weight: 2, dashArray: "5, 5",
        }).addTo(map);
        poly.bindTooltip(`${area.toLocaleString()} sqm`, {
          permanent: true, direction: "bottom", offset: L.point(0, 0),
        }).openTooltip();
      }
    }).catch((err) => console.error("Leaflet load failed:", err));

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mounted]);

  function updateLocation(newLat: number, newLng: number) {
    onLatChange(newLat.toFixed(6));
    onLngChange(newLng.toFixed(6));
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.setView([newLat, newLng], 15);
    }
  }

  const geocodeAddress = useCallback(async (addr: string) => {
    if (!addr || addr.length < 5) return;
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    geoTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&accept-language=en`
        );
        const data = await res.json();
        if (data?.[0]) {
          updateLocation(parseFloat(data[0].lat), parseFloat(data[0].lon));
        }
      } catch { /* silent */ }
    }, 600);
  }, []);

  useEffect(() => {
    const fullAddress = [address, community, city].filter(Boolean).join(", ");
    if (fullAddress.length > 5 && (!lat || lat === "0" || lat === "6.45") && (!lng || lng === "0" || lng === "3.42")) {
      geocodeAddress(fullAddress);
    }
  }, [address, city, community]);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=en`
        );
        setSearchResults(await res.json());
        setShowResults(true);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
  }

  if (!mounted) {
    return <div className="h-[350px] animate-pulse rounded-xl bg-secondary" />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for an address or place..."
            className="pl-9"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[1000] mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
            {searchResults.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  updateLocation(parseFloat(r.lat), parseFloat(r.lon));
                  setSearchQuery(r.display_name.split(",")[0]);
                  setShowResults(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={mapRef} className="h-[350px] w-full rounded-xl border border-border" style={{ minHeight: "350px" }} />
      {isLand && area > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing approximate {area.toLocaleString()} sqm boundary — adjust marker position as needed.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Click or drag the marker to set exact location.
      </p>
    </div>
  );
}
