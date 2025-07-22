"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { X, SquarePlus, SquareMinus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// import proj4 from "proj4";

interface MapPreviewProps {
  data: any;
  sourceProjection?: string;
  bounds?: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
    crs?: string;
  };
  focusFeature?: any;
  onClearFocus?: () => void;
  onFeatureClick?: (feature: any) => void;
}

export default function MapPreview({
  data,
  sourceProjection = "EPSG:4326",
  focusFeature,
  onClearFocus,
  onFeatureClick,
}: MapPreviewProps) {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);
  const focusedFeatureLayerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      destroyMap();
      initializeMap(data);
    }
  }, [data]);

  useEffect(() => {
    if (focusFeature && mapInstance.current && geoJsonLayerRef.current) {
      highlightFeature(focusFeature);
    }
  }, [focusFeature]);

  const destroyMap = () => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      geoJsonLayerRef.current = null;
      focusedFeatureLayerRef.current = null;
    }
  };

  const initializeMap = (geoJsonData: any) => {
    if (!mapContainer.current) return;

    setIsLoading(true);

    const map = L.map(mapContainer.current).setView([0, 0], 2);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", () => {
      handleClearSelection();
    });

    L.control.scale().addTo(map);

    const validFeatures = geoJsonData.features?.filter(
      (f: any) => f.geometry?.coordinates?.length
    );

    if (!validFeatures || validFeatures.length === 0) {
      setError(t("noValidGeometry"));
      setIsLoading(false);
      return;
    }

    const processedGeoJson = {
      type: "FeatureCollection",
      features: JSON.parse(JSON.stringify(validFeatures)),
    };

    // const normalizedProj = normalizeProjectionCode(sourceProjection);
    // if (normalizedProj !== "EPSG:4326") {
    //   processedGeoJson.features.forEach((f) =>
    //     reprojectGeometry(f.geometry, normalizedProj, "EPSG:4326")
    //   );
    // }

    const layer = L.geoJSON(processedGeoJson, {
      style: { color: "#4c68c7", weight: 2 },
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 5,
          fillColor: "#4c68c7",
          color: "#4c68c7",
          weight: 1,
          fillOpacity: 0.8,
        }),
      onEachFeature: (feature, layer) => {
        const popup = Object.entries(feature.properties || {})
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join("<br>");
        layer.bindPopup(popup);
        layer.on("click", () => {
          onFeatureClick?.(feature);
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = layer;

    const bounds = layer.getBounds();

    if (bounds?.isValid?.()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
    }

    setIsLoading(false);
  };

  const highlightFeature = (feature: any) => {
    const map = mapInstance.current;
    if (!map || !geoJsonLayerRef.current) return;

    const isPoint =
      feature.geometry?.type === "Point" ||
      feature.geometry?.type === "MultiPoint";

    geoJsonLayerRef.current.eachLayer((layer: any) => {
      const match =
        layer.feature &&
        (layer.feature.id === feature.id ||
          JSON.stringify(layer.feature.properties) ===
            JSON.stringify(feature.properties));

      if (!match) return;

      // Clear previous highlight
      if (
        focusedFeatureLayerRef.current &&
        map.hasLayer(focusedFeatureLayerRef.current)
      ) {
        map.removeLayer(focusedFeatureLayerRef.current);
      }

      let center: L.LatLng | undefined;
      let bounds: L.LatLngBounds | undefined;

      if (isPoint && layer.getLatLng) {
        center = layer.getLatLng();
        bounds = L.latLngBounds([center]);

        // Highlight point with custom circle
        const highlightCircle = L.circleMarker(center, {
          radius: 10,
          color: "#ffa39e",
          weight: 2,
          fillColor: "#ffa39e",
          fillOpacity: 0.6,
        }).addTo(map);

        focusedFeatureLayerRef.current = highlightCircle;
      } else {
        // Highlight polygon/line with geoJSON styling
        const highlighted = L.geoJSON(layer.feature, {
          style: {
            color: "#ffa39e",
            weight: 4,
            opacity: 1,
            fillOpacity: 0.7,
          },
        }).addTo(map);

        focusedFeatureLayerRef.current = highlighted;

        if (layer.getBounds && layer.getBounds().isValid()) {
          bounds = layer.getBounds();
          center = bounds.getCenter();
        }
      }

      if (bounds && bounds.isValid && bounds.isValid() && center) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });

        const popupContent = Object.entries(feature.properties || {})
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join("<br>");

        const popup = L.popup({
          offset: L.point(0, isPoint ? -30 : 0),
        })
          .setLatLng(center)
          .setContent(popupContent)
          .openOn(map);

        // Attach close button logic
        setTimeout(() => {
          const closeBtn = document.querySelector(
            ".leaflet-popup-close-button"
          ) as HTMLElement | null;

          if (closeBtn) {
            closeBtn.addEventListener("click", () => {
              handleClearSelection();
            });
          }
        }, 1000);
      }
    });
  };

  const handleClearSelection = () => {
    if (onClearFocus) onClearFocus();
    const map = mapInstance.current;
    if (
      focusedFeatureLayerRef.current &&
      map?.hasLayer(focusedFeatureLayerRef.current)
    ) {
      map.removeLayer(focusedFeatureLayerRef.current);
      focusedFeatureLayerRef.current = null;
    }
  };

  return (
    <div
      ref={mapContainer}
      className="h-full w-full relative"
      style={{ minHeight: "400px", zIndex: 500 }}
    >
      {/* {focusFeature && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <Button onClick={handleClearSelection} variant="outline" size="sm">
            <X className="h-4 w-4" /> {t("clearSelection")}
          </Button>
        </div>
      )} */}

      <div
        className="rounded-md absolute m-2 right-0 z-10 inline-grid bg-white p-2 "
        style={{ zIndex: 1000 }}
      >
        <button
          className="mb-2"
          onClick={() => {
            mapInstance.current?.zoomIn();
          }}
          title="zoom in"
        >
          <SquarePlus></SquarePlus>
        </button>

        <button
          onClick={() => {
            mapInstance.current?.zoomOut();
          }}
          title="zoom out"
        >
          <SquareMinus></SquareMinus>
        </button>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mb-2"></div>
            <p>{t("loadingMap")}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 z-10">
          <div className="bg-white p-4 rounded shadow text-center">
            <p className="warning-300 font-medium">{error}</p>
            <p className="text-sm text-gray-600 mt-1">{t("checkConsole")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
