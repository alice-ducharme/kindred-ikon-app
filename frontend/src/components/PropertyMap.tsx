import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Property } from "./PropertyCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface PropertyMapProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
}

const PropertyMap = ({ properties, onPropertyClick }: PropertyMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [tokenSet, setTokenSet] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const initializeMap = (token: string) => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-106.5, 39.5],
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    setTokenSet(true);
  };

  useEffect(() => {
    if (!tokenSet || !map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each property
    properties.forEach((property) => {
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.innerHTML = `
        <div class="bg-accent text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;
      
      el.addEventListener("click", () => onPropertyClick(property));

      const driveTimeHtml = property.driveTime 
        ? `<p class="text-sm text-gray-600">Estimated drive: ${Math.round(property.driveTime)} min</p>`
        : '';
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.lng, property.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${property.name}</h3>
                <p class="text-sm text-gray-600">${property.resort}</p>
                ${driveTimeHtml}
              </div>
            `)
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all properties
    if (properties.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      properties.forEach(property => {
        bounds.extend([property.lng, property.lat]);
      });
      map.current?.fitBounds(bounds, { padding: 50 });
    }
  }, [properties, tokenSet, onPropertyClick]);

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (!tokenSet) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MapPin className="h-5 w-5 -mb-0.5 text-accent" />
          Configure Map
        </div>
        <p className="text-sm text-muted-foreground">
          To display the map, please enter your Mapbox public token. You can get one for free at{" "}
          <a 
            href="https://mapbox.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            mapbox.com
          </a>
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="pk.eyJ1..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={() => initializeMap(mapboxToken)}
            disabled={!mapboxToken}
            className="bg-primary hover:bg-primary/90"
          >
            Load Map
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div ref={mapContainer} className="w-full h-[600px] rounded-lg shadow-[var(--shadow-elegant)] overflow-hidden" />
  );
};

export default PropertyMap;
