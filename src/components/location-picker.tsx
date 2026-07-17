import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationPickerProps {
  lat: string;
  lng: string;
  area: number;
  propertyType: string;
  onLatChange: (v: string) => void;
  onLngChange: (v: string) => void;
}

export function LocationPicker({ lat, lng, area, propertyType, onLatChange, onLngChange }: LocationPickerProps) {
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current || mapInstanceRef.current) return;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
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

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        onLatChange(e.latlng.lat.toFixed(6));
        onLngChange(e.latlng.lng.toFixed(6));
        map.setView(e.latlng, map.getZoom());
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      if (isLand && area > 0) {
        drawScalePolygon(map, marker, latNum, lngNum, area);
      }
    })();

    return () => {
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
    if (isLand && area > 0) {
      drawScalePolygon(mapInstanceRef.current, markerRef.current, newLat, newLng, area);
    }
  }

  function drawScalePolygon(map: any, marker: any, centerLat: number, centerLng: number, areaSqm: number) {
    if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    const side = Math.sqrt(areaSqm);
    const halfSideMeters = side / 2;

    const latPerMeter = 1 / 111320;
    const lngPerMeter = 1 / (111320 * Math.cos((centerLat * Math.PI) / 180));

    const dLat = halfSideMeters * latPerMeter;
    const dLng = halfSideMeters * lngPerMeter;

    const corners = [
      [centerLat - dLat, centerLng - dLng],
      [centerLat - dLat, centerLng + dLng],
      [centerLat + dLat, centerLng + dLng],
      [centerLat + dLat, centerLng - dLng],
    ];

    const L = (window as any).L;
    polygonRef.current = L.polygon(corners, {
      color: "#2563eb",
      fillColor: "#3b82f6",
      fillOpacity: 0.2,
      weight: 2,
      dashArray: "5, 5",
    }).addTo(map);

    const labelLat = centerLat + dLat + (3 * latPerMeter);
    polygonRef.current.bindTooltip(`${areaSqm.toLocaleString()} sqm`, {
      permanent: true,
      direction: "bottom",
      offset: L.point(0, 0),
      className: "land-area-label",
    }).openTooltip();
  }

  function removePolygon() {
    if (polygonRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
  }

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      removePolygon();
      if (isLand && area > 0) {
        const pos = markerRef.current.getLatLng();
        drawScalePolygon(mapInstanceRef.current, markerRef.current, pos.lat, pos.lng, area);
      }
    }
  }, [area, propertyType]);

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
        const data = await res.json();
        setSearchResults(data);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      }
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
      <div ref={mapRef} className="h-[350px] w-full rounded-xl border border-border" />
      {isLand && area > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing approximate {area.toLocaleString()} sqm boundary (dashed blue) — adjust marker position as needed.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Click or drag the marker to set exact location.
      </p>
    </div>
  );
}
