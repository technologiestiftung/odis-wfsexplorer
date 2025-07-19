import { normalizeProjectionCode, reprojectGeometry } from "@/lib/geo-utils";

// Default maximum number of features to fetch
const DEFAULT_MAX_FEATURES = 500;

// Update the LayerInfo interface to include outputFormats
export interface LayerInfo {
  id: string;
  title: string;
  abstract?: string;
  projections: string[];
  defaultProjection?: string;
  outputFormats?: string[]; // Add this field to store supported output formats
  bounds?: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
    crs?: string;
  };
  keywords?: string[];
  contactPerson?: string;
  contactOrganization?: string;
  contactEmail?: string;
  fees?: string;
  accessConstraints?: string;
  metadataUrl?: string;
}

// Update the fetchWfsCapabilities function to better handle URL parameters and add more robust error handling
export async function fetchWfsCapabilities(
  baseUrl: string
): Promise<LayerInfo[]> {
  try {
    // Clean up the URL to ensure we're working with the base URL
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch (e) {
      throw new Error(
        `Invalid URL format: ${baseUrl}. Please check the URL and try again.`
      );
    }

    // Create a capabilities URL - preserve any authentication or other relevant query params
    const originalParams = new URLSearchParams(url.search);
    const searchParams = new URLSearchParams();

    // Copy over any authentication params that might be needed
    for (const [key, value] of originalParams.entries()) {
      if (!["service", "version", "request"].includes(key.toLowerCase())) {
        searchParams.set(key, value);
      }
    }

    // Set WFS parameters - use lowercase for better compatibility with some servers
    searchParams.set("service", "WFS");
    searchParams.set("version", "2.0.0");
    searchParams.set("request", "GetCapabilities");

    const capabilitiesUrl = `${url.origin}${
      url.pathname
    }?${searchParams.toString()}`;

    console.log("Fetching capabilities from:", capabilitiesUrl);

    // Try with fetch first
    try {
      const response = await fetch(capabilitiesUrl, {
        method: "GET",
        headers: {
          Accept: "text/xml,application/xml",
        },
      });

      if (!response.ok) {
        const statusCode = response.status;
        let errorMessage = `Failed to fetch WFS capabilities: ${statusCode} ${response.statusText}`;

        // Add more specific error messages for common status codes
        if (statusCode === 400) {
          errorMessage = `Bad Request (400): The WFS server rejected the request. This URL may not be a valid WFS endpoint or the server doesn't support the WFS protocol.`;
        } else if (statusCode === 401 || statusCode === 403) {
          errorMessage = `Authentication Error (${statusCode}): This WFS service requires authentication.`;
        } else if (statusCode === 404) {
          errorMessage = `Not Found (404): The WFS service was not found at this URL. Please check the URL and try again.`;
        } else if (statusCode === 500) {
          errorMessage = `Server Error (500): The WFS server encountered an internal error.`;
        }

        throw new Error(errorMessage);
      }

      const text = await response.text();
      return parseCapabilitiesXml(text);
    } catch (fetchError) {
      console.error("Error with primary fetch method:", fetchError);

      // If the error is already a formatted error message, rethrow it
      if (
        fetchError instanceof Error &&
        (fetchError.message.includes("Bad Request") ||
          fetchError.message.includes("Authentication Error") ||
          fetchError.message.includes("Not Found") ||
          fetchError.message.includes("Server Error"))
      ) {
        throw fetchError;
      }

      // Try alternative URL format (some servers are picky about parameter case)
      const altUrl = `${url.origin}${url.pathname}?service=wfs&version=2.0.0&request=GetCapabilities`;
      console.log("Trying alternative URL format:", altUrl);

      try {
        const altResponse = await fetch(altUrl, {
          method: "GET",
          headers: {
            Accept: "text/xml,application/xml",
          },
        });

        if (!altResponse.ok) {
          // Try with version 1.0.0 as a last resort
          const legacyUrl = `${url.origin}${url.pathname}?service=wfs&version=1.0.0&request=GetCapabilities`;
          console.log("Trying legacy URL format:", legacyUrl);

          try {
            const legacyResponse = await fetch(legacyUrl, {
              method: "GET",
              headers: {
                Accept: "text/xml,application/xml",
              },
            });

            if (!legacyResponse.ok) {
              // If all attempts fail, throw a comprehensive error
              throw new Error(
                `WFS Service Error: Could not connect to a valid WFS service at this URL. The server returned ${legacyResponse.status} ${legacyResponse.statusText}. Please verify this is a valid WFS endpoint.`
              );
            }

            const legacyText = await legacyResponse.text();
            return parseCapabilitiesXml(legacyText);
          } catch (legacyError) {
            // If the legacy attempt fails with a network error, throw a more specific error
            if (
              legacyError instanceof TypeError &&
              legacyError.message.includes("Failed to fetch")
            ) {
              throw new Error(
                `Network Error: Could not connect to the WFS service. Please check your internet connection and the server availability.`
              );
            }
            throw legacyError;
          }
        }

        const altText = await altResponse.text();
        return parseCapabilitiesXml(altText);
      } catch (altError) {
        // If the alternative attempt fails with a network error, throw a more specific error
        if (
          altError instanceof TypeError &&
          altError.message.includes("Failed to fetch")
        ) {
          throw new Error(
            `Network Error: Could not connect to the WFS service. Please check your internet connection and the server availability.`
          );
        }
        throw altError;
      }
    }
  } catch (error) {
    console.error("Error fetching WFS capabilities:", error);

    // Create more descriptive error messages based on the error type
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        `Network Error: Failed to connect to the WFS service. Please check your internet connection and the server availability.`
      );
    }

    if (error instanceof Error) {
      // If the error is already well-formatted, just rethrow it
      if (
        error.message.includes("Bad Request") ||
        error.message.includes("Authentication Error") ||
        error.message.includes("Not Found") ||
        error.message.includes("Server Error") ||
        error.message.includes("Network Error") ||
        error.message.includes("WFS Service Error")
      ) {
        throw error;
      }
    }

    // For any other errors, try to create a minimal layer info from the URL as a last resort
    try {
      const url = new URL(baseUrl);
      const pathParts = url.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];

      // Check if this looks like a WFS URL before returning a minimal layer
      if (
        url.pathname.toLowerCase().includes("wfs") ||
        url.search.toLowerCase().includes("wfs") ||
        lastPart.toLowerCase().includes("wfs")
      ) {
        console.log(
          "URL appears to be WFS-related, attempting to create minimal layer info"
        );
        // Return a minimal layer info based on the URL
        return [
          {
            id: lastPart,
            title: lastPart,
            projections: ["EPSG:4326"],
            defaultProjection: "EPSG:4326",
          },
        ];
      } else {
        // If it doesn't look like a WFS URL, throw a more specific error
        throw new Error(
          `Invalid WFS URL: The URL does not appear to point to a WFS service. Please check the URL and try again.`
        );
      }
    } catch (e) {
      // If all else fails, throw the original error with a clearer message
      if (error instanceof Error) {
        throw new Error(`WFS Service Error: ${error.message}`);
      } else {
        throw new Error(`Unknown error fetching WFS capabilities`);
      }
    }
  }
}

// Update the parseCapabilitiesXml function to extract output formats
function parseCapabilitiesXml(xmlText: string): LayerInfo[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(
      "Failed to parse WFS capabilities XML. The response from the server is not valid XML."
    );
  }

  // Extract feature type nodes
  let featureTypeNodes = xmlDoc.querySelectorAll("FeatureType");

  if (featureTypeNodes.length === 0) {
    featureTypeNodes = xmlDoc.querySelectorAll("wfs\\:FeatureType");
  }

  if (featureTypeNodes.length === 0) {
    // Try with namespace wildcard
    featureTypeNodes = xmlDoc.querySelectorAll("*|FeatureType");
  }

  // Last resort - try to find any element with a Name child that might be a feature type
  if (featureTypeNodes.length === 0) {
    const nameNodes = xmlDoc.querySelectorAll("Name, wfs\\:Name, *|Name");
    // Filter to only those that might be feature type names
    const potentialLayers: LayerInfo[] = [];
    nameNodes.forEach((node) => {
      if (
        node.textContent &&
        node.parentElement &&
        ![
          "WFS_Capabilities",
          "ServiceIdentification",
          "ServiceProvider",
        ].includes(node.parentElement.nodeName)
      ) {
        potentialLayers.push({
          id: node.textContent.trim(),
          title: node.textContent.trim(),
          projections: ["EPSG:4326"], // Default assumption
          outputFormats: [
            "application/json",
            "application/gml+xml",
            "text/xml",
            "GML2",
            "GML3",
          ], // Default formats
        });
      }
    });

    if (potentialLayers.length > 0) {
      return potentialLayers;
    }

    // Check if this is a WFS response but doesn't have feature types
    const wfsCapabilities = xmlDoc.querySelector(
      "WFS_Capabilities, wfs\\:WFS_Capabilities, *|WFS_Capabilities"
    );
    if (wfsCapabilities) {
      throw new Error(
        "This appears to be a valid WFS service, but no feature types (layers) were found."
      );
    }

    throw new Error(
      "No feature types found in WFS capabilities. This may not be a valid WFS service."
    );
  }

  // Try to extract service metadata
  let contactPerson = "";
  let contactOrganization = "";
  let contactEmail = "";
  let fees = "";
  let accessConstraints = "";

  // Extract service provider information
  const serviceProviderNode = xmlDoc.querySelector(
    "ServiceProvider, wfs\\:ServiceProvider, *|ServiceProvider"
  );
  if (serviceProviderNode) {
    const providerNameNode = serviceProviderNode.querySelector(
      "ProviderName, wfs\\:ProviderName, *|ProviderName"
    );
    if (providerNameNode && providerNameNode.textContent) {
      contactOrganization = providerNameNode.textContent.trim();
    }

    const contactInfoNode = serviceProviderNode.querySelector(
      "ServiceContact, wfs\\:ServiceContact, *|ServiceContact"
    );
    if (contactInfoNode) {
      const individualNameNode = contactInfoNode.querySelector(
        "IndividualName, wfs\\:IndividualName, *|IndividualName"
      );
      if (individualNameNode && individualNameNode.textContent) {
        contactPerson = individualNameNode.textContent.trim();
      }

      const contactInfoDetails = contactInfoNode.querySelector(
        "ContactInfo, wfs\\:ContactInfo, *|ContactInfo"
      );
      if (contactInfoDetails) {
        const addressNode = contactInfoDetails.querySelector(
          "Address, wfs\\:Address, *|Address"
        );
        if (addressNode) {
          const emailNode = addressNode.querySelector(
            "ElectronicMailAddress, wfs\\:ElectronicMailAddress, *|ElectronicMailAddress"
          );
          if (emailNode && emailNode.textContent) {
            contactEmail = emailNode.textContent.trim();
          }
        }
      }
    }
  }

  // Extract service metadata
  const serviceIdentificationNode = xmlDoc.querySelector(
    "ServiceIdentification, wfs\\:ServiceIdentification, *|ServiceIdentification"
  );
  if (serviceIdentificationNode) {
    const feesNode = serviceIdentificationNode.querySelector(
      "Fees, wfs\\:Fees, *|Fees"
    );
    if (feesNode && feesNode.textContent) {
      fees = feesNode.textContent.trim();
    }

    const accessConstraintsNode = serviceIdentificationNode.querySelector(
      "AccessConstraints, wfs\\:AccessConstraints, *|AccessConstraints"
    );
    if (accessConstraintsNode && accessConstraintsNode.textContent) {
      accessConstraints = accessConstraintsNode.textContent.trim();
    }
  }

  // Extract supported output formats
  let globalOutputFormats: string[] = [];
  const operationsMetadataNode = xmlDoc.querySelector(
    "OperationsMetadata, wfs\\:OperationsMetadata, *|OperationsMetadata"
  );
  if (operationsMetadataNode) {
    const getFeatureNode = operationsMetadataNode.querySelector(
      "Operation[name='GetFeature'], wfs\\:Operation[name='GetFeature'], *|Operation[name='GetFeature']"
    );
    if (getFeatureNode) {
      const parameterNodes = getFeatureNode.querySelectorAll(
        "Parameter[name='outputFormat'], wfs\\:Parameter[name='outputFormat'], *|Parameter[name='outputFormat']"
      );
      parameterNodes.forEach((paramNode) => {
        const allowedValues = paramNode.querySelectorAll(
          "AllowedValues > Value, wfs\\:AllowedValues > wfs\\:Value, *|AllowedValues > *|Value"
        );
        allowedValues.forEach((valueNode) => {
          if (valueNode.textContent) {
            globalOutputFormats.push(valueNode.textContent.trim());
          }
        });
      });
    }
  }

  // If no global output formats found, try WFS 1.0.0 style
  if (globalOutputFormats.length === 0) {
    const capabilityNode = xmlDoc.querySelector(
      "Capability, wfs\\:Capability, *|Capability"
    );
    if (capabilityNode) {
      const requestNode = capabilityNode.querySelector(
        "Request, wfs\\:Request, *|Request"
      );
      if (requestNode) {
        const getFeatureNode = requestNode.querySelector(
          "GetFeature, wfs\\:GetFeature, *|GetFeature"
        );
        if (getFeatureNode) {
          const formatNodes = getFeatureNode.querySelectorAll(
            "Format, wfs\\:Format, *|Format"
          );
          formatNodes.forEach((formatNode) => {
            if (formatNode.textContent) {
              globalOutputFormats.push(formatNode.textContent.trim());
            }
          });
        }
      }
    }
  }

  // If still no output formats found, use defaults
  if (globalOutputFormats.length === 0) {
    globalOutputFormats = [
      "application/json",
      "application/gml+xml",
      "text/xml",
      "GML2",
      "GML3",
    ];
  }

  const layers: LayerInfo[] = [];

  featureTypeNodes.forEach((node) => {
    // Extract layer ID (name)
    const nameNode =
      node.querySelector("Name") ||
      node.querySelector("wfs\\:Name") ||
      node.querySelector("*|Name");
    if (!nameNode || !nameNode.textContent) return;

    const layerId = nameNode.textContent.trim();

    // Extract layer title
    const titleNode =
      node.querySelector("Title") ||
      node.querySelector("wfs\\:Title") ||
      node.querySelector("*|Title");
    const layerTitle = titleNode?.textContent?.trim() || layerId;

    // Extract layer abstract
    const abstractNode =
      node.querySelector("Abstract") ||
      node.querySelector("wfs\\:Abstract") ||
      node.querySelector("*|Abstract");
    const layerAbstract = abstractNode?.textContent?.trim();

    // Extract keywords
    const keywordsNode =
      node.querySelector("Keywords") ||
      node.querySelector("wfs\\:Keywords") ||
      node.querySelector("*|Keywords");
    let keywords: string[] = [];
    if (keywordsNode && keywordsNode.textContent) {
      // Keywords might be comma-separated or in individual Keyword elements
      const keywordText = keywordsNode.textContent.trim();
      if (keywordText) {
        keywords = keywordText
          .split(/,|\n/)
          .map((k) => k.trim())
          .filter((k) => k);
      }
    }

    // Try to find individual keyword elements
    const keywordNodes = node.querySelectorAll(
      "Keyword, wfs\\:Keyword, *|Keyword"
    );
    if (keywordNodes.length > 0) {
      keywords = Array.from(keywordNodes)
        .map((node) => node.textContent?.trim() || "")
        .filter((k) => k);
    }

    // Extract metadata URL if available
    let metadataUrl = "";
    const metadataUrlNode = node.querySelector(
      "MetadataURL, wfs\\:MetadataURL, *|MetadataURL"
    );
    if (metadataUrlNode) {
      const urlNode = metadataUrlNode.querySelector(
        "OnlineResource, wfs\\:OnlineResource, *|OnlineResource"
      );
      if (urlNode && urlNode.getAttribute("xlink:href")) {
        metadataUrl = urlNode.getAttribute("xlink:href") || "";
      }
    }

    // Extract supported CRS/SRS
    const crsNodes = node.querySelectorAll(
      "DefaultCRS, OtherCRS, DefaultSRS, OtherSRS, wfs\\:DefaultCRS, wfs\\:OtherCRS, wfs\\:DefaultSRS, wfs\\:OtherSRS, *|DefaultCRS, *|OtherCRS, *|DefaultSRS, *|OtherSRS"
    );

    const projections: string[] = [];
    let defaultProjection: string | undefined;

    crsNodes.forEach((crsNode) => {
      if (crsNode.textContent) {
        const crs = crsNode.textContent.trim();

        // Convert URN format to EPSG:xxxx format if needed
        let formattedCrs = crs;
        if (crs.startsWith("urn:ogc:def:crs:EPSG:")) {
          // Handle URN format with version number: urn:ogc:def:crs:EPSG:6.9:25833
          const parts = crs.split(":");
          const epsgCode = parts[parts.length - 1];
          formattedCrs = `EPSG:${epsgCode}`;
        } else if (crs.startsWith("http://www.opengis.net/gml/srs/epsg.xml#")) {
          formattedCrs = `EPSG:${crs.split("#").pop()}`;
        } else if (crs.startsWith("http://www.opengis.net/def/crs/EPSG/")) {
          const parts = crs.split("/");
          const epsgCode = parts[parts.length - 1];
          formattedCrs = `EPSG:${epsgCode}`;
        }

        projections.push(formattedCrs);

        // Set default projection if this is the DefaultCRS/DefaultSRS
        if (
          crsNode.nodeName.includes("DefaultCRS") ||
          crsNode.nodeName.includes("DefaultSRS")
        ) {
          defaultProjection = formattedCrs;
        }
      }
    });

    // If no projections found, assume EPSG:4326 (WGS 84)
    if (projections.length === 0) {
      projections.push("EPSG:4326");
    }

    // Always add EPSG:4326 if it's not already in the list
    if (!projections.includes("EPSG:4326")) {
      projections.push("EPSG:4326");
    }

    // If no default projection set, use the first one in the list
    if (!defaultProjection && projections.length > 0) {
      defaultProjection = projections[0];
    }

    // Extract bounding box if available
    const bboxNode = node.querySelector(
      "WGS84BoundingBox, wfs\\:WGS84BoundingBox, *|WGS84BoundingBox, BoundingBox, wfs\\:BoundingBox, *|BoundingBox"
    );

    let bounds: LayerInfo["bounds"] | undefined;

    if (bboxNode) {
      const lowerCornerNode = bboxNode.querySelector(
        "LowerCorner, wfs\\:LowerCorner, *|LowerCorner"
      );
      const upperCornerNode = bboxNode.querySelector(
        "UpperCorner, wfs\\:UpperCorner, *|UpperCorner"
      );

      if (lowerCornerNode?.textContent && upperCornerNode?.textContent) {
        const lowerCorner = lowerCornerNode.textContent
          .trim()
          .split(" ")
          .map(Number);
        const upperCorner = upperCornerNode.textContent
          .trim()
          .split(" ")
          .map(Number);

        if (lowerCorner.length >= 2 && upperCorner.length >= 2) {
          bounds = {
            minx: lowerCorner[0],
            miny: lowerCorner[1],
            maxx: upperCorner[0],
            maxy: upperCorner[1],
            crs: bboxNode.nodeName.includes("WGS84") ? "EPSG:4326" : undefined,
          };
        }
      }
    }

    // Extract feature-specific output formats if available
    let outputFormats = [...globalOutputFormats];
    const formatNodes = node.querySelectorAll(
      "OutputFormats > Format, wfs\\:OutputFormats > wfs\\:Format, *|OutputFormats > *|Format"
    );
    if (formatNodes.length > 0) {
      // If feature type has specific formats, use those instead
      outputFormats = [];
      formatNodes.forEach((formatNode) => {
        if (formatNode.textContent) {
          outputFormats.push(formatNode.textContent.trim());
        }
      });
    }

    layers.push({
      id: layerId,
      title: layerTitle,
      abstract: layerAbstract,
      projections,
      defaultProjection,
      outputFormats,
      bounds,
      keywords,
      contactPerson,
      contactOrganization,
      contactEmail,
      fees,
      accessConstraints,
      metadataUrl,
    });
  });

  return layers;
}

export async function fetchDescribeFeatureType(
  baseUrl: string,
  typeName: string
): Promise<{ name: string; type: string }[]> {
  let cleanUrl = baseUrl.trim();
  const urlObj = new URL(cleanUrl);
  cleanUrl = `${urlObj.origin}${urlObj.pathname}`;

  try {
    const url = new URL(cleanUrl);
    const originalParams = new URLSearchParams(url.search);
    const searchParams = new URLSearchParams();

    // Preserve important query parameters (e.g., tokens)
    for (const [key, value] of originalParams.entries()) {
      if (
        !["service", "version", "request", "typeName"].includes(
          key.toLowerCase()
        )
      ) {
        searchParams.set(key, value);
      }
    }

    // Set required WFS DescribeFeatureType parameters
    searchParams.set("service", "WFS");
    searchParams.set("version", "2.0.0");
    searchParams.set("request", "DescribeFeatureType");
    searchParams.set("typeName", typeName);

    const describeUrl = `${url.origin}${
      url.pathname
    }?${searchParams.toString()}`;
    console.log("Fetching DescribeFeatureType from:", describeUrl);

    const response = await fetch(describeUrl, {
      method: "GET",
      headers: {
        Accept: "application/xml,text/xml",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch DescribeFeatureType: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();

    return parseDescribeFeatureTypeXml(xmlText);
  } catch (error) {
    console.error("Error fetching DescribeFeatureType:", error);
    throw error instanceof Error ? error : new Error("Unknown error");
  }
}

type SchemaInfo = {
  attributes: {
    name: string;
    type: string;
    nillable?: boolean;
    minOccurs?: number;
    maxOccurs?: number | "unbounded";
  }[];
};

export function parseDescribeFeatureTypeXml(xmlText: string): SchemaInfo {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  const schemaEl = xmlDoc.querySelector("schema, xsd\\:schema, *|schema");
  if (!schemaEl) {
    throw new Error(
      "Invalid DescribeFeatureType response: No <schema> element found."
    );
  }

  const elements = Array.from(
    schemaEl.querySelectorAll("element, xsd\\:element, *|element")
  );

  const attributes = elements
    .map((el) => {
      const name = el.getAttribute("name");
      const type = el.getAttribute("type");
      const nillable = el.getAttribute("nillable") === "true";
      const minOccurs = el.getAttribute("minOccurs")
        ? parseInt(el.getAttribute("minOccurs")!, 10)
        : undefined;
      const maxOccurs =
        el.getAttribute("maxOccurs") === "unbounded"
          ? "unbounded"
          : el.getAttribute("maxOccurs")
          ? parseInt(el.getAttribute("maxOccurs")!, 10)
          : undefined;

      if (!name || !type) return null;

      return { name, type, nillable, minOccurs, maxOccurs };
    })
    .filter((field): field is NonNullable<typeof field> => !!field);

  return { attributes };
}

// Helper function to extract geometry from GML
function extractGeometryFromGml(geomElement: Element): GeoJSON.Geometry | null {
  const gmlNS = "http://www.opengis.net/gml";
  const posLists = geomElement.getElementsByTagNameNS(gmlNS, "posList");

  if (posLists.length === 0) return null;

  const rings: number[][][] = [];

  for (const posList of Array.from(posLists)) {
    const coords = posList.textContent?.trim().split(/\s+/).map(Number) || [];
    const ring: number[][] = [];

    for (let i = 0; i < coords.length; i += 2) {
      ring.push([coords[i], coords[i + 1]]);
    }

    // Ensure closed ring
    if (
      ring.length &&
      (ring[0][0] !== ring.at(-1)?.[0] || ring[0][1] !== ring.at(-1)?.[1])
    ) {
      ring.push([...ring[0]]);
    }

    rings.push(ring);
  }

  // Support MultiPolygon if multiple surfaceMembers are found
  if (rings.length === 1) {
    return {
      type: "Polygon",
      coordinates: rings,
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: [rings],
  };
}

// Update the processResponse function to handle XML/GML responses
async function processResponse(response: Response, isGml = false) {
  try {
    const contentType = response.headers.get("content-type") || "";
    const isXml = contentType.includes("xml") || isGml;
    let data: any;

    if (isXml) {
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const gmlNS = "http://www.opengis.net/gml";
      const wfsNS = "http://www.opengis.net/wfs/2.0";

      data = {
        type: "FeatureCollection",
        features: [],
      };

      const members = xmlDoc.getElementsByTagNameNS(wfsNS, "member");

      if (members.length === 0) {
        console.warn("No wfs:member elements found. Trying fallback mode.");
      }

      for (const member of Array.from(members)) {
        const featureNode = Array.from(member.children)[0]; // Generic — any feature type
        if (!featureNode) continue;

        const properties: Record<string, any> = {};
        let geometry: GeoJSON.Geometry | null = null;

        for (const child of Array.from(featureNode.children)) {
          const tagName = child.localName.toLowerCase();

          if (tagName.includes("geom")) {
            geometry = extractGeometryFromGml(child);
          } else {
            const text = child.textContent?.trim();
            if (!text) continue;

            let typedValue: any = text;
            if (/^-?\d+(\.\d+)?$/.test(text)) {
              typedValue = parseFloat(text);
            } else if (text.toLowerCase() === "true") {
              typedValue = true;
            } else if (text.toLowerCase() === "false") {
              typedValue = false;
            }

            properties[tagName] = typedValue;
          }
        }

        const id =
          featureNode.getAttributeNS(gmlNS, "id") ||
          featureNode.getAttribute("id") ||
          `feature-${data.features.length}`;

        data.features.push({
          type: "Feature",
          id,
          geometry,
          properties,
        });
      }

      // ✅ Fallback: collect features manually if above failed
      if (data.features.length === 0) {
        console.warn("Fallback: no features parsed. Attempting element scan.");

        const allElements = xmlDoc.getElementsByTagName("*");
        const seenIds = new Set<string>();

        for (const el of Array.from(allElements)) {
          const id =
            el.getAttributeNS(gmlNS, "id") || el.getAttribute("id") || null;
          if (!id || seenIds.has(id)) continue;

          const children = Array.from(el.children);
          const properties: Record<string, any> = {};
          let hasProps = false;

          for (const child of children) {
            const tag = child.localName.toLowerCase();
            const text = child.textContent?.trim();
            if (!text || tag === "boundedby") continue;

            if (!tag.includes("geom")) {
              hasProps = true;
              properties[tag] = text;
            }
          }

          if (hasProps) {
            seenIds.add(id);
            data.features.push({
              type: "Feature",
              id,
              geometry: null,
              properties,
            });
          }
        }
      }
    } else {
      // ✅ Handle JSON/GeoJSON fallback
      data = await response.json();
    }

    if (!data.type || !Array.isArray(data.features)) {
      throw new Error("Invalid response format from WFS");
    }

    // ✅ Extract unique attributes
    const attributesSet = new Set<string>();
    data.features.forEach((feature: any) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach((key) =>
          attributesSet.add(key)
        );
      }
    });

    const attributes = Array.from(attributesSet).sort();
    return { data, attributes };
  } catch (error) {
    console.error("Error processing WFS response:", error);
    throw new Error(
      `Failed to process WFS response: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Fetches the total count of features in a WFS layer without fetching the actual features
 * @param baseUrl The base WFS URL
 * @param layerId The ID of the layer to count
 * @returns The total number of features
 */
export async function fetchFeatureCount(
  baseUrl: string,
  layerId: string
): Promise<number> {
  try {
    // Ensure the URL is valid
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch (e) {
      throw new Error(`Invalid URL: ${baseUrl}`);
    }

    // Preserve any authentication or other relevant query params from the original URL
    const originalParams = new URLSearchParams(url.search);
    const searchParams = new URLSearchParams();

    // Copy over any authentication params that might be needed
    for (const [key, value] of originalParams.entries()) {
      if (
        ![
          "service",
          "version",
          "request",
          "typename",
          "typenames",
          "outputformat",
          "count",
          "resulttype",
        ].includes(key.toLowerCase())
      ) {
        searchParams.set(key, value);
      }
    }

    // Add standard WFS parameters for counting
    searchParams.set("service", "WFS");
    searchParams.set("version", "2.0.0");
    searchParams.set("request", "GetFeature");
    searchParams.set("typeNames", layerId);
    searchParams.set("resultType", "hits");

    const requestUrl = `${url.origin}${
      url.pathname
    }?${searchParams.toString()}`;

    console.log("Fetching feature count from:", requestUrl);

    // Fetch the count
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "text/xml,application/xml",
      },
    });

    if (!response.ok) {
      // Try with typeNames (plural) instead of typeName
      searchParams.delete("typeNames");
      searchParams.set("typeName", layerId);

      const alternativeUrl = `${url.origin}${
        url.pathname
      }?${searchParams.toString()}`;
      console.log(
        "First count attempt failed. Trying alternative URL:",
        alternativeUrl
      );

      const alternativeResponse = await fetch(alternativeUrl, {
        method: "GET",
        headers: {
          Accept: "text/xml,application/xml",
        },
      });

      if (!alternativeResponse.ok) {
        // Try with WFS 1.0.0
        searchParams.set("version", "1.0.0");
        searchParams.delete("typeNames");
        searchParams.set("typename", layerId);
        searchParams.delete("resultType");
        searchParams.set("resulttype", "hits");

        const legacyUrl = `${url.origin}${
          url.pathname
        }?${searchParams.toString()}`;
        console.log(
          "Second count attempt failed. Trying legacy URL:",
          legacyUrl
        );

        const legacyResponse = await fetch(legacyUrl, {
          method: "GET",
          headers: {
            Accept: "text/xml,application/xml",
          },
        });

        if (!legacyResponse.ok) {
          throw new Error(
            `Failed to fetch feature count: ${response.status} ${response.statusText}. The WFS service might not support feature counting.`
          );
        }

        return await extractFeatureCount(legacyResponse);
      }

      return await extractFeatureCount(alternativeResponse);
    }

    return await extractFeatureCount(response);
  } catch (error) {
    console.error("Error fetching feature count:", error);
    throw error;
  }
}

/**
 * Extract the feature count from a WFS GetFeature response with resultType=hits
 */
async function extractFeatureCount(response: Response): Promise<number> {
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");

  // Try different attribute names for the count
  // WFS 2.0.0 uses numberMatched, WFS 1.0.0 uses numberOfFeatures
  const rootElement = xmlDoc.documentElement;

  if (rootElement) {
    const numberMatched =
      rootElement.getAttribute("numberMatched") ||
      rootElement.getAttribute("wfs:numberMatched") ||
      rootElement.getAttribute("numberOfFeatures") ||
      rootElement.getAttribute("wfs:numberOfFeatures");

    if (numberMatched) {
      return Number.parseInt(numberMatched, 10);
    }
  }

  // If we can't find the count attribute, return -1 to indicate unknown
  return -1;
}

// Update the fetchWfsData function to try JSON first, then fall back to GML
export async function fetchWfsData(
  baseUrl: string,
  layerId: string,
  maxFeatures: number = DEFAULT_MAX_FEATURES,
  layer?: LayerInfo,
  isDowload?: boolean
) {
  try {
    // Use the layer's default projection if available, otherwise use WGS84
    const sourceProjection = layer?.defaultProjection || "EPSG:4326";
    // const sourceProjection =
    //   (layer?.projections?.includes("EPSG:4326")
    //     ? "EPSG:4326"
    //     : layer?.defaultProjection) || "EPSG:4326";
    console.log(`Using source projection: ${sourceProjection}`);

    // Ensure the URL is valid
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch (e) {
      throw new Error(`Invalid URL: ${baseUrl}`);
    }

    // Preserve any authentication or other relevant query params from the original URL
    const originalParams = new URLSearchParams(url.search);
    const searchParams = new URLSearchParams();

    // Copy over any authentication params that might be needed
    for (const [key, value] of originalParams.entries()) {
      if (
        ![
          "service",
          "version",
          "request",
          "typename",
          "typenames",
          "outputformat",
          "count",
          "srsname",
        ].includes(key.toLowerCase())
      ) {
        searchParams.set(key, value);
      }
    }

    // Always try JSON first, regardless of what's in the metadata
    let outputFormat = "application/json";
    const useGmlFallback = false;
    const formatSupported = true;
    let jsonFormatInMetadata = false;

    if (layer && layer.outputFormats) {
      // Check if JSON format is explicitly supported in metadata
      const jsonFormats = layer.outputFormats.filter(
        (format) =>
          format.includes("json") ||
          format.includes("JSON") ||
          format.includes("geojson") ||
          format.includes("GEOJSON")
      );

      if (jsonFormats.length > 0) {
        // Use the first JSON format available from metadata
        outputFormat = jsonFormats[0];
        jsonFormatInMetadata = true;
        console.log(`Using JSON output format from metadata: ${outputFormat}`);
      } else {
        // JSON not in metadata, but we'll try it anyway
        console.log(
          `JSON format not found in metadata, but trying it first anyway`
        );
      }
    }

    // Add standard WFS parameters
    searchParams.set("service", "WFS");
    searchParams.set("version", "2.0.0");
    searchParams.set("request", "GetFeature");
    searchParams.set("typeNames", layerId);
    searchParams.set("outputFormat", outputFormat);
    searchParams.set(
      "count",
      maxFeatures === 0 ? "100000" : maxFeatures.toString()
    );

    // Use the source projection
    searchParams.set("srsName", sourceProjection);

    let requestUrl = `${url.origin}${url.pathname}?${searchParams.toString()}`;

    console.log("Fetching WFS data from:", requestUrl);

    // Try multiple approaches to fetch the data
    try {
      // First attempt with standard parameters
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: useGmlFallback
            ? "text/xml,application/xml"
            : "application/json,application/geo+json",
        },
      });

      let result;
      console.log("isDowload?: boolean = false", isDowload);

      if (isDowload) {
        result = await processResponse(response, useGmlFallback);
        const normalizedProj = normalizeProjectionCode(sourceProjection);
        if (normalizedProj !== "EPSG:4326") {
          console.log("reprojecting geom....");

          result.data.features.forEach((f) =>
            reprojectGeometry(f.geometry, normalizedProj, "EPSG:4326")
          );
        }
      } else {
        result = await processResponse(response, useGmlFallback);
      }

      if (result.data.features.length === 0) {
        console.warn(
          "Look like there are no features. Carry on trying with GML"
        );
        throw new Error("No Features");
      }

      return {
        ...result,
        sourceProjection,
      };
    } catch (error) {
      console.log("JSON format attempt failed:", error);

      // If JSON wasn't in metadata and the attempt failed, try GML format
      if (!jsonFormatInMetadata) {
        console.log("Trying GML format as fallback");

        // Try with GML format
        const gmlParams = new URLSearchParams(searchParams);
        // Find a GML format in the metadata if available
        let gmlFormat = "text/xml; subtype=gml/3.1.1";

        if (layer && layer.outputFormats) {
          const gmlFormats = layer.outputFormats.filter(
            (format) =>
              format.includes("gml") ||
              format.includes("GML") ||
              format.includes("xml") ||
              format.includes("XML")
          );

          if (gmlFormats.length > 0) {
            gmlFormat = gmlFormats[0];
          }
        }

        gmlParams.set("outputFormat", gmlFormat);

        const gmlUrl = `${url.origin}${url.pathname}?${gmlParams.toString()}`;
        console.log("Trying GML format:", gmlUrl);

        try {
          const gmlResponse = await fetch(gmlUrl, {
            method: "GET",
            headers: {
              Accept: "text/xml,application/xml",
            },
          });

          if (!gmlResponse.ok) {
            throw new Error(`Failed with GML format: ${gmlResponse.status}`);
          }

          const result = await processResponse(gmlResponse, true);
          return {
            ...result,
            sourceProjection,
          };
        } catch (gmlError) {
          console.log(
            "GML format attempt failed, trying alternative parameters:",
            gmlError
          );
        }
      }

      // Continue with the original fallback approaches
      console.log("Trying alternative parameters");

      // Try with typeNames (plural) instead of typeName
      const altParams = new URLSearchParams(searchParams);
      altParams.delete("typeNames");
      altParams.set("typeName", layerId);

      const alternativeUrl = `${url.origin}${
        url.pathname
      }?${altParams.toString()}`;
      console.log("Trying alternative URL:", alternativeUrl);

      try {
        const alternativeResponse = await fetch(alternativeUrl, {
          method: "GET",
          headers: {
            Accept: useGmlFallback
              ? "text/xml,application/xml"
              : "application/json,application/geo+json",
          },
        });

        if (!alternativeResponse.ok) {
          throw new Error(`Failed with status: ${alternativeResponse.status}`);
        }

        const result = await processResponse(
          alternativeResponse,
          useGmlFallback
        );
        return {
          ...result,
          sourceProjection,
        };
      } catch (altError) {
        console.log("Second attempt failed, trying WFS 1.0.0:", altError);

        // Try with WFS 1.0.0
        const legacyParams = new URLSearchParams();
        legacyParams.set("service", "WFS");
        legacyParams.set("version", "1.0.0");
        legacyParams.set("request", "GetFeature");
        legacyParams.set("typename", layerId);
        legacyParams.set("outputFormat", outputFormat);
        legacyParams.set("maxFeatures", maxFeatures.toString());
        legacyParams.set("srsName", sourceProjection);

        const legacyUrl = `${url.origin}${
          url.pathname
        }?${legacyParams.toString()}`;
        console.log("Trying legacy URL:", legacyUrl);

        const legacyResponse = await fetch(legacyUrl, {
          method: "GET",
          headers: {
            Accept: useGmlFallback
              ? "text/xml,application/xml"
              : "application/json,application/geo+json",
          },
        });

        if (!legacyResponse.ok) {
          // Try one more time with GML format and convert it
          const gmlParams = new URLSearchParams(legacyParams);
          gmlParams.delete("outputFormat");

          const gmlUrl = `${url.origin}${gmlParams.toString()}`;
          console.log("Trying GML format as last resort:", gmlUrl);

          const gmlResponse = await fetch(gmlUrl, {
            method: "GET",
            headers: {
              Accept: "text/xml,application/xml",
            },
          });

          if (!gmlResponse.ok) {
            throw new Error(
              `Failed to fetch WFS data after multiple attempts. The WFS service might not support CORS or the requested format.`
            );
          }

          const result = await processResponse(gmlResponse, true);
          return {
            ...result,
            sourceProjection,
          };
        }

        const result = await processResponse(legacyResponse, useGmlFallback);
        return {
          ...result,
          sourceProjection,
        };
      }
    }
  } catch (error) {
    console.error("Error fetching WFS data:", error);
    throw error;
  }
}

// Update the existing fetchWfsDataForDownload to use the new function for native projection
export async function fetchWfsDataForDownload(
  baseUrl: string,
  layerId: string,
  maxFeatures: number = DEFAULT_MAX_FEATURES,
  layer?: LayerInfo,
  useNativeProjection = false,
  isDownload?: boolean
) {
  // Declare fetchWfsNativeData here to avoid the "variable is undeclared" error
  async function fetchWfsNativeData(
    baseUrl: string,
    layerId: string,
    maxFeatures: number = DEFAULT_MAX_FEATURES,
    layer?: LayerInfo
  ) {
    // Use the layer's default projection if available, otherwise use WGS84
    const sourceProjection = layer?.defaultProjection || "EPSG:4326";
    console.log(`Using source projection: ${sourceProjection}`);

    // Ensure the URL is valid
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch (e) {
      throw new Error(`Invalid URL: ${baseUrl}`);
    }

    // Preserve any authentication or other relevant query params from the original URL
    const originalParams = new URLSearchParams(url.search);
    const searchParams = new URLSearchParams();

    // Copy over any authentication params that might be needed
    for (const [key, value] of originalParams.entries()) {
      if (
        ![
          "service",
          "version",
          "request",
          "typename",
          "typenames",
          "outputformat",
          "count",
          "srsname",
        ].includes(key.toLowerCase())
      ) {
        searchParams.set(key, value);
      }
    }

    // Check for supported output formats
    let outputFormat = "application/json";
    let useGmlFallback = false;
    let formatSupported = true;

    if (layer && layer.outputFormats) {
      // Check if JSON format is supported
      const jsonFormats = layer.outputFormats.filter(
        (format) =>
          format.includes("json") ||
          format.includes("JSON") ||
          format.includes("geojson") ||
          format.includes("GEOJSON")
      );

      if (jsonFormats.length > 0) {
        // Use the first JSON format available
        outputFormat = jsonFormats[0];
        console.log(`Using JSON output format: ${outputFormat}`);
      } else {
        // Check if GML format is supported as fallback
        const gmlFormats = layer.outputFormats.filter(
          (format) =>
            format.includes("gml") ||
            format.includes("GML") ||
            format.includes("xml") ||
            format.includes("XML")
        );

        if (gmlFormats.length > 0) {
          // Use GML as fallback
          outputFormat = gmlFormats[0];
          useGmlFallback = true;
          console.log(
            `JSON format not supported. Using GML fallback: ${outputFormat}`
          );
        } else {
          // Neither JSON nor GML is supported
          formatSupported = false;
          console.error(
            "Neither JSON nor GML format is supported by this WFS service"
          );

          // Dispatch an event to notify about unsupported format
          if (typeof document !== "undefined") {
            const formatErrorEvent = new CustomEvent("format-error", {
              detail: {
                message: "Unsupported output format",
                supportedFormats: layer.outputFormats,
                jsonAttempted: false, // Initially false, will be set to true if we actually try JSON and it fails
              },
            });
            document.dispatchEvent(formatErrorEvent);
          }

          throw new Error(
            "This WFS service does not support JSON or GML output formats"
          );
        }
      }
    }

    // Add standard WFS parameters
    searchParams.set("service", "WFS");
    searchParams.set("version", "2.0.0");
    searchParams.set("request", "GetFeature");
    searchParams.set("typeName", layerId);
    searchParams.set("outputFormat", outputFormat);
    searchParams.set(
      "count",
      maxFeatures === 0 ? "100000" : maxFeatures.toString()
    );

    // Use the source projection
    searchParams.set("srsName", sourceProjection);

    const requestUrl = `${url.origin}${
      url.pathname
    }?${searchParams.toString()}`;

    console.log("ÄÄÄÄÄÄÄSss", url.origin);

    console.log("Fetching WFS data from:", requestUrl);

    // Try multiple approaches to fetch the data
    try {
      // First attempt with standard parameters
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: useGmlFallback
            ? "text/xml,application/xml"
            : "application/json,application/geo+json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status}`);
      }

      const result = await processResponse(response, useGmlFallback);
      return {
        data: result.data,
        sourceProjection,
      };
    } catch (error) {
      console.log(
        "First attempt failed, trying alternative parameters:",
        error
      );

      // Try with typeNames (plural) instead of typeName
      const altParams = new URLSearchParams(searchParams);
      altParams.delete("typeName");
      altParams.set("typeNames", layerId);

      const alternativeUrl = `${url.origin}${
        url.pathname
      }?${altParams.toString()}`;
      console.log("url.origin ", url.origin);
      console.log("Trying alternative URL:", alternativeUrl);

      try {
        const alternativeResponse = await fetch(alternativeUrl, {
          method: "GET",
          headers: {
            Accept: useGmlFallback
              ? "text/xml,application/xml"
              : "application/json,application/geo+json",
          },
        });

        if (!alternativeResponse.ok) {
          throw new Error(`Failed with status: ${alternativeResponse.status}`);
        }

        const result = await processResponse(
          alternativeResponse,
          useGmlFallback
        );
        return {
          data: result.data,
          sourceProjection,
        };
      } catch (altError) {
        console.log("Second attempt failed, trying WFS 1.0.0:", altError);

        // Try with WFS 1.0.0
        const legacyParams = new URLSearchParams();
        legacyParams.set("service", "WFS");
        legacyParams.set("version", "1.0.0");
        legacyParams.set("request", "GetFeature");
        legacyParams.set("typename", layerId);
        legacyParams.set("outputFormat", outputFormat);
        legacyParams.set("maxFeatures", maxFeatures.toString());
        legacyParams.set("srsName", sourceProjection);

        const legacyUrl = `${url.origin}${legacyParams.toString()}`;
        console.log("Trying legacy URL:", legacyUrl);

        const legacyResponse = await fetch(legacyUrl, {
          method: "GET",
          headers: {
            Accept: useGmlFallback
              ? "text/xml,application/xml"
              : "application/json,application/geo+json",
          },
        });

        if (!legacyResponse.ok) {
          // Try one more time with GML format and convert it
          const gmlParams = new URLSearchParams(legacyParams);
          gmlParams.delete("outputFormat");

          const gmlUrl = `${url.origin}${gmlParams.toString()}`;
          console.log("Trying GML format as last resort:", gmlUrl);

          const gmlResponse = await fetch(gmlUrl, {
            method: "GET",
            headers: {
              Accept: "text/xml,application/xml",
            },
          });

          if (!gmlResponse.ok) {
            throw new Error(
              `Failed to fetch WFS data after multiple attempts. The WFS service might not support CORS or the requested format.`
            );
          }

          const result = await processResponse(gmlResponse, true);
          return {
            data: result.data,
            sourceProjection,
          };
        }

        const result = await processResponse(legacyResponse, useGmlFallback);
        return {
          data: result.data,
          sourceProjection,
        };
      }
    }
  }

  try {
    // If maxFeatures is 0, it means download all features
    const effectiveMaxFeatures = maxFeatures === 0 ? 100000 : maxFeatures;

    if (useNativeProjection) {
      // Fetch data in native projection
      const { data, sourceProjection } = await fetchWfsNativeData(
        baseUrl,
        layerId,
        effectiveMaxFeatures,
        layer
      );
      console.log(`Returning data in native projection: ${sourceProjection}`);
      return JSON.stringify(data, null, 2);
    } else {
      // Fetch the data using the existing fetchWfsData function that reprojects to WGS84
      const { data } = await fetchWfsData(
        baseUrl,
        layerId,
        effectiveMaxFeatures,
        layer,
        isDownload
      );
      return JSON.stringify(data, null, 2);
    }
  } catch (error) {
    console.error("Error fetching WFS data for download:", error);
    throw error;
  }
}

export async function fetchCapabilities(baseUrl: string): Promise<LayerInfo[]> {
  return fetchWfsCapabilities(baseUrl);
}
