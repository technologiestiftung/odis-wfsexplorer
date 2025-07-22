// geo-utils.ts
import proj4 from "proj4";
import defs from "proj4js-definitions";
proj4.defs(defs);

// Normalize a projection code string to standard EPSG:xxxx format
export function normalizeProjectionCode(projCode: string): string {
  if (!projCode) return "EPSG:4326";

  // Handle URN format: urn:ogc:def:crs:EPSG:6.9:25833
  if (projCode.startsWith("urn:ogc:def:crs:EPSG:")) {
    const parts = projCode.split(":");
    return `EPSG:${parts[parts.length - 1]}`;
  }

  // Handle http format: http://www.opengis.net/gml/srs/epsg.xml#25833
  if (projCode.startsWith("http://www.opengis.net/gml/srs/epsg.xml#")) {
    return `EPSG:${projCode.split("#").pop()}`;
  }

  // Handle http format: http://www.opengis.net/def/crs/EPSG/0/3035
  if (projCode.startsWith("http://www.opengis.net/def/crs/EPSG/")) {
    return `EPSG:${projCode.split("/").pop()}`;
  }

  return projCode; // already in EPSG:xxxx format
}

// Reproject a GeoJSON geometry object from one CRS to another
export function reprojectGeometry(
  geometry: any,
  fromProj: string,
  toProj: string
) {
  if (!geometry?.coordinates || typeof window === "undefined") return;

  const from = normalizeProjectionCode(fromProj);
  const to = normalizeProjectionCode(toProj);

  if (!proj4.defs[from] || !proj4.defs[to]) {
    console.error(`Missing projection defs for ${from} or ${to}`);
    return;
  }

  const reprojectCoord = (coord: number[]) => {
    if (!Array.isArray(coord) || coord.length < 2) return coord;
    const result = proj4(from, to, [coord[0], coord[1]]);
    if (coord.length > 2) result.push(coord[2]);
    return result;
  };

  switch (geometry.type) {
    case "Point":
      geometry.coordinates = reprojectCoord(geometry.coordinates);
      break;
    case "LineString":
    case "MultiPoint":
      geometry.coordinates = geometry.coordinates.map(reprojectCoord);
      break;
    case "Polygon":
    case "MultiLineString":
      geometry.coordinates = geometry.coordinates.map((ring: number[][]) =>
        ring.map(reprojectCoord)
      );
      break;
    case "MultiPolygon":
      geometry.coordinates = geometry.coordinates.map((polygon: number[][][]) =>
        polygon.map((ring) => ring.map(reprojectCoord))
      );
      break;
    default:
      console.warn("Unsupported geometry type:", geometry.type);
  }
}

// Extract a sample coordinate to help detect projection
export function getCoordinateSample(geometry: any): number[] | null {
  if (!geometry?.coordinates) return null;

  switch (geometry.type) {
    case "Point":
      return geometry.coordinates;
    case "LineString":
    case "MultiPoint":
      return geometry.coordinates[0];
    case "Polygon":
    case "MultiLineString":
      return geometry.coordinates[0]?.[0];
    case "MultiPolygon":
      return geometry.coordinates[0]?.[0]?.[0];
    default:
      return null;
  }
}

export function isLikelyWGS84(feature) {
  if (!feature || feature.type !== "Feature" || !feature.geometry) {
    return false;
    // throw new Error("Invalid GeoJSON Feature");
  }

  function isValidLonLat(coord) {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    const [lon, lat] = coord;
    return (
      typeof lon === "number" &&
      typeof lat === "number" &&
      lon >= -180 &&
      lon <= 180 &&
      lat >= -90 &&
      lat <= 90
    );
  }

  function checkCoordinates(coords) {
    if (typeof coords[0] === "number") {
      // Single coordinate
      return isValidLonLat(coords);
    } else if (Array.isArray(coords[0])) {
      // Nested array: recurse
      return coords.every(checkCoordinates);
    }
    return false;
  }

  const geometry = feature.geometry;

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.every((g) => checkCoordinates(g.coordinates));
  }

  return checkCoordinates(geometry.coordinates);
}
