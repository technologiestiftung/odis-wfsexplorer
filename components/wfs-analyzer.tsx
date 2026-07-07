"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "react-tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  Info,
  Search,
  Share2,
  Check,
  Map,
  BarChart3,
  Filter,
  Globe,
  FileJson,
  Download,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  WandSparkles,
  TableOfContents,
  Sigma,
  X,
  Layers,
  ArrowLeftRight
} from "lucide-react";
import {
  fetchWfsCapabilities,
  fetchWfsData,
  fetchFeatureCount,
  type LayerInfo,
  type BBoxFilter
} from "@/lib/wfs-service";
import { LayerSelector } from "@/components/layer-selector";
import { FeatureCountSelector } from "@/components/feature-count-selector";
import { AttributeExplorer } from "@/components/attribute-explorer";
import { AttributeStats } from "@/components/attribute-stats";
import {
  AttributeFilter,
  type FilterCondition
} from "@/components/attribute-filter";
import { BboxFilter } from "@/components/bbox-filter";
import { DownloadOptions } from "@/components/download-options";
import { DownloadFilteredOptions } from "@/components/download-filtered-options";
import dynamic from "next/dynamic";
import { ExampleDatasets } from "@/components/example-datasets";
import { LanguageSwitcher } from "@/components/language-switcher";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  normalizeProjectionCode,
  reprojectGeometry,
  isLikelyWGS84
} from "@/lib/geo-utils";

// Use dynamic import with no SSR for the MapPreview component
const MapPreview = dynamic(() => import("@/components/map-preview"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mb-2"></div>
        <p>loading</p>
      </div>
    </div>
  )
});

// Change to default export
export default function WfsAnalyzer() {
  type SearchDataset = {
    name: string;
    url: string;
    typ?: string;
    mdId?: string;
    cswUrl?: string;
    unavailableReason?: string;
    layers?: string[];
  };

  const { t } = useLanguage();
  const [wfsUrl, setWfsUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wfsData, setWfsData] = useState<any>(null);
  const [filteredData, setFilteredData] = useState<any>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(
    null
  );
  const [availableLayers, setAvailableLayers] = useState<LayerInfo[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerInfo | null>(null);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);
  const [maxFeatures, setMaxFeatures] = useState(500);
  const [totalFeatureCount, setTotalFeatureCount] = useState<number | null>(
    null
  );
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [activeTab, setActiveTab] = useState("explorer");
  const [hasGeometry, setHasGeometry] = useState(false);
  const [sourceProjection, setSourceProjection] = useState<string>("EPSG:4326");
  const [isFiltered, setIsFiltered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasProjectionIssue, setHasProjectionIssue] = useState(false);
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  const [focusedFeature, setFocusedFeature] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMaxFeaturesUpdating, setIsMaxFeaturesUpdating] = useState(false);
  const [downloadType, setDownloadType] = useState("wgs84");
  const [supportsJsonFormat, setSupportsJsonFormat] = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showLayerDetails, setShowLayerDetails] = useState(false);
  const [errorType, setErrorType] = useState<
    "network" | "auth" | "notFound" | "badRequest" | "server" | "unknown" | null
  >(null);
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [bboxFilter, setBboxFilter] = useState<BBoxFilter | null>(null);
  const [initialFilters, setInitialFilters] = useState<FilterCondition[]>([]);
  const [searchDatasets, setSearchDatasets] = useState<SearchDataset[]>([]);
  const lastAnalyzedUrlRef = useRef<string | null>(null);
  const [datasetsParamUrl, setDatasetsParamUrl] = useState<string | null>(null);
  const [isDatasetsLoading, setIsDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [datasetInfoMessage, setDatasetInfoMessage] = useState<string | null>(
    null
  );
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false);
  const [resolvingDatasetKey, setResolvingDatasetKey] = useState<string | null>(
    null
  );
  const [wmsResolutionState, setWmsResolutionState] = useState<
    Record<string, "unchecked" | "checking" | "wfs" | "no-wfs">
  >({});
  const [visibleDatasetKeys, setVisibleDatasetKeys] = useState<
    Record<string, boolean>
  >({});
  const [pendingLayerName, setPendingLayerName] = useState<string | null>(null);
  const datasetListRef = useRef<HTMLDivElement>(null);
  const datasetItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const datasetDropdownWrapperRef = useRef<HTMLDivElement>(null);

  // Helper function to update filters in URL
  const updateFiltersParameter = (filters: FilterCondition[]) => {
    if (typeof window === "undefined") return;

    console.log("updateFiltersParameter called with:", filters);
    console.trace("updateFiltersParameter stack trace");

    const newUrl = new URL(window.location.href);

    if (!filters.length) {
      newUrl.searchParams.delete("filters");
    } else {
      const serializedFilters = JSON.stringify(
        filters.map(({ attribute, operator, value, value2 }) => ({
          attribute,
          operator,
          value,
          ...(value2 ? { value2 } : {})
        }))
      );
      newUrl.searchParams.set("filters", serializedFilters);
    }

    window.history.pushState(
      { path: newUrl.toString() },
      "",
      newUrl.toString()
    );
  };

  // Helper function to parse filters from URL
  const parseFiltersParameter = (value: string | null): FilterCondition[] => {
    console.log("parseFiltersParameter input:", value);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      console.log("parseFiltersParameter parsed:", parsed);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((filter: Partial<FilterCondition>, index: number) => ({
        id: filter.id || `filter-url-${Date.now()}-${index}`,
        attribute: String(filter.attribute || ""),
        operator: String(filter.operator || "equals"),
        value: String(filter.value || ""),
        value2: filter.value2 ? String(filter.value2) : undefined
      }));
    } catch (error) {
      console.warn("Unable to parse filters from URL parameter.", error);
      return [];
    }
  };

  const getTextByLocalName = (parent: Element, localName: string) => {
    const node = Array.from(parent.getElementsByTagName("*")).find(
      (element) => element.localName === localName
    );

    return node?.textContent?.trim() || "";
  };

  const looksLikeWfs = (url: string, protocol: string, name: string) => {
    const joined = `${url} ${protocol} ${name}`.toLowerCase();
    return (
      joined.includes("wfs") ||
      url.toLowerCase().includes("service=wfs") ||
      url.toLowerCase().includes("/wfs")
    );
  };

  const looksLikeWms = (url: string, protocol: string, name: string) => {
    const joined = `${url} ${protocol} ${name}`.toLowerCase();
    return (
      joined.includes("wms") ||
      url.toLowerCase().includes("service=wms") ||
      url.toLowerCase().includes("/wms")
    );
  };

  const resolveDatasetFromCsw = async (
    mdId: string,
    cswUrl: string
  ): Promise<SearchDataset> => {
    const cswEndpoint = new URL(cswUrl);
    cswEndpoint.searchParams.set("service", "CSW");
    cswEndpoint.searchParams.set("request", "GetRecordById");
    cswEndpoint.searchParams.set("version", "2.0.2");
    cswEndpoint.searchParams.set(
      "outputschema",
      "http://www.isotc211.org/2005/gmd"
    );
    cswEndpoint.searchParams.set("elementsetname", "full");
    cswEndpoint.searchParams.set("id", mdId);

    const response = await fetch(cswEndpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/xml,text/xml"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Could not load CSW record ${mdId}. Server returned ${response.status} ${response.statusText}.`
      );
    }

    const xmlText = await response.text();
    const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");

    const onlineResources = Array.from(xmlDoc.getElementsByTagName("*")).filter(
      (element) => element.localName === "CI_OnlineResource"
    );

    const wfsResources = onlineResources
      .map((resource) => {
        const url = getTextByLocalName(resource, "URL");
        const protocol = getTextByLocalName(resource, "protocol");
        const name = getTextByLocalName(resource, "name");
        return { url, protocol, name };
      })
      .filter(
        (resource) =>
          resource.url &&
          looksLikeWfs(resource.url, resource.protocol, resource.name)
      );

    const wmsResources = onlineResources
      .map((resource) => {
        const url = getTextByLocalName(resource, "URL");
        const protocol = getTextByLocalName(resource, "protocol");
        const name = getTextByLocalName(resource, "name");
        return { url, protocol, name };
      })
      .filter(
        (resource) =>
          resource.url &&
          looksLikeWms(resource.url, resource.protocol, resource.name)
      );

    if (wfsResources.length > 0) {
      return {
        name: mdId,
        url: wfsResources[0].url
      };
    }

    if (wmsResources.length > 0) {
      return {
        name: mdId,
        url: "",
        unavailableReason: t("onlyWMSavailable") + wmsResources[0].url
      };
    }

    return {
      name: mdId,
      url: "",
      unavailableReason: "No WFS was found for the dataset"
    };
  };

  const sanitizeWfsUrl = (url: string) => {
    let cleanUrl = url.trim();

    if (
      cleanUrl.includes("GetCapabilities") ||
      cleanUrl.includes("getcapabilities")
    ) {
      try {
        const urlObj = new URL(cleanUrl);
        const params = new URLSearchParams(urlObj.search);
        params.delete("request");
        params.delete("service");
        params.delete("version");

        const remainingParams = params.toString();
        cleanUrl = `${urlObj.origin}${urlObj.pathname}${
          remainingParams ? `?${remainingParams}` : ""
        }`;
      } catch (e) {
        console.error("Error cleaning URL:", e);
      }
    }

    return cleanUrl;
  };

  const getDatasets = async (datasetsUrl: string) => {
    setIsDatasetsLoading(true);
    setDatasetsError(null);
    setDatasetInfoMessage(null);

    let res: unknown;
    let directFetchError: string | null = null;

    try {
      const response = await fetch(datasetsUrl, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}.`
        );
      }

      res = await response.json();
    } catch (error) {
      directFetchError =
        error instanceof Error ? error.message : "Unknown client fetch error.";
    }

    if (!res) {
      const proxyResponse = await fetch(
        `/api/datasets-proxy?url=${encodeURIComponent(datasetsUrl)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!proxyResponse.ok) {
        throw new Error(
          `Could not load datasets from ${datasetsUrl}. Direct request failed (${
            directFetchError || "unknown error"
          }) and proxy returned ${proxyResponse.status} ${
            proxyResponse.statusText
          }.`
        );
      }

      const proxyPayload = await proxyResponse.json();
      res = proxyPayload?.data;
    }

    if (!Array.isArray(res)) {
      throw new Error(
        `Datasets file at ${datasetsUrl} must be a JSON array of objects with name and url fields.`
      );
    }

    const rawDatasets = res as Array<{
      id?: unknown;
      name?: unknown;
      url?: unknown;
      typ?: unknown;
      layers?: unknown;
      datasets?: Array<{
        md_id?: unknown;
        csw_url?: unknown;
      }>;
    }>;

    const datasets = rawDatasets
      .map((d) => {
        const id = typeof d.id === "string" ? d.id : "";
        const name = typeof d.name === "string" ? d.name : "";
        const url = typeof d.url === "string" ? d.url : "";
        const typ = typeof d.typ === "string" ? d.typ.toLowerCase() : undefined;
        const mdId =
          typeof d.datasets?.[0]?.md_id === "string"
            ? d.datasets[0].md_id
            : undefined;
        const cswUrl =
          typeof d.datasets?.[0]?.csw_url === "string"
            ? d.datasets[0].csw_url
            : undefined;
        const layers = Array.isArray(d.layers)
          ? d.layers.filter((l): l is string => typeof l === "string")
          : typeof d.layers === "string"
            ? [d.layers]
            : undefined;

        // Must have typ = wfs or wms
        if (!typ || (typ !== "wfs" && typ !== "wms")) return null;
        // Must have id and url
        if (!id || !url) return null;
        // WMS entries must have CSW metadata to resolve WFS alternative
        if (typ === "wms" && (!mdId || !cswUrl)) return null;

        return {
          name: name || mdId || url || "Unnamed dataset",
          url,
          typ,
          mdId,
          cswUrl,
          layers: layers && layers.length > 0 ? layers : undefined
        } as SearchDataset;
      })
      .filter((dataset): dataset is SearchDataset => !!dataset)
      .sort((a, b) =>
        (a.name || a.url || "").localeCompare(
          b.name || b.url || "",
          undefined,
          {
            sensitivity: "base"
          }
        )
      );

    setSearchDatasets(datasets);
  };

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wfsParam = params.get("wfs");
      const datasetsParam = params.get("datasets");
      const filtersParam = params.get("filters");
      const bboxParam = params.get("bbox");

      if (wfsParam) {
        console.log("Loading WFS from URL parameter:", wfsParam);
        setWfsUrl(wfsParam);

        // Parse filters from URL
        const parsedFilters = parseFiltersParameter(filtersParam);
        console.log("Parsed filters from URL:", parsedFilters);
        if (parsedFilters.length > 0) {
          console.log("Setting initialFilters to:", parsedFilters);
          setInitialFilters(parsedFilters);
          // Mark that we're applying initial filters - will be cleared after first filter apply
          isApplyingInitialFilters.current = true;
        }

        // Parse bbox from URL (format: minx,miny,maxx,maxy)
        let parsedBbox: BBoxFilter | null = null;
        if (bboxParam) {
          const parts = bboxParam.split(",").map(Number);
          if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
            console.log("Parsed bbox from URL:", parts);
            parsedBbox = {
              minx: parts[0],
              miny: parts[1],
              maxx: parts[2],
              maxy: parts[3]
            };
            setBboxFilter(parsedBbox);
          }
        }

        // Pass parsed values directly to avoid stale state issues
        setTimeout(() => {
          analyzeWfsUrl(wfsParam, parsedBbox, parsedFilters);
        }, 0);
      }

      if (datasetsParam) {
        setDatasetsParamUrl(datasetsParam);
        getDatasets(datasetsParam)
          .catch((err) => {
            const message =
              err instanceof Error
                ? err.message
                : "Unable to load datasets file.";
            console.error("Failed to load datasets:", message);
            setDatasetsError(message);
            setSearchDatasets([]);
          })
          .finally(() => {
            setIsDatasetsLoading(false);
          });
      }
    }
  }, []);

  const filteredDatasets = useMemo(() => {
    const query = wfsUrl.trim().toLowerCase();
    if (!query) return searchDatasets;

    return searchDatasets.filter((dataset) => {
      return (
        dataset.name.toLowerCase().includes(query) ||
        dataset.url.toLowerCase().includes(query)
      );
    });
  }, [searchDatasets, wfsUrl]);

  const defaultVisibleDatasetKeys = useMemo(() => {
    const firstVisible = filteredDatasets.slice(0, 8);
    return new Set(
      firstVisible.map(
        (dataset) => `${dataset.name}-${dataset.mdId || dataset.url}`
      )
    );
  }, [filteredDatasets]);

  // Handle auto-selecting layer from URL param on initial load
  // Also handles single-layer WFS when bbox/filters need to be applied
  const urlLayerLoadedRef = useRef(false);
  useEffect(() => {
    console.log("Layer load effect running:", {
      urlLayerLoadedRef: urlLayerLoadedRef.current,
      availableLayersLength: availableLayers.length,
      bboxFilter,
      initialFiltersLength: initialFilters.length
    });
    if (
      typeof window !== "undefined" &&
      !urlLayerLoadedRef.current &&
      availableLayers.length > 0
    ) {
      const params = new URLSearchParams(window.location.search);
      const wfsLayer = params.get("layer");

      let layerToLoad: LayerInfo | null = null;

      if (wfsLayer) {
        // Try exact match first
        let layerFound = availableLayers.find((l) => l.id === wfsLayer);

        // If not found, try matching by layer name suffix
        if (!layerFound) {
          layerFound = availableLayers.find(
            (l) =>
              l.id.endsWith(`:${wfsLayer}`) ||
              wfsLayer.endsWith(`:${l.id}`) ||
              l.id.split(":").pop() === wfsLayer.split(":").pop()
          );
        }

        if (layerFound) {
          layerToLoad = layerFound;
        }
      } else if (
        availableLayers.length === 1 &&
        (bboxFilter || initialFilters.length > 0)
      ) {
        // Single layer WFS with bbox/filters from URL - need to fetch with the filters applied
        layerToLoad = availableLayers[0];
        console.log(
          "Single layer with bbox/filters, will load layer:",
          layerToLoad?.id
        );
      }

      if (layerToLoad) {
        urlLayerLoadedRef.current = true;
        const layer = layerToLoad;
        const bboxToUse = bboxFilter; // Capture in closure
        console.log(
          "Setting urlLayerLoadedRef=true, scheduling fetch with bbox:",
          bboxToUse
        );
        setTimeout(() => {
          setSelectedLayer(layer);
          // Use captured bboxFilter value
          fetchLayerDataWithMaxFeatures(layer, maxFeatures, wfsUrl, bboxToUse);
        }, 0);
      }
    }
  }, [availableLayers, bboxFilter, initialFilters.length]);

  // Handle auto-selecting layer from pending layer name (from datasets selection)
  useEffect(() => {
    if (pendingLayerName && availableLayers.length > 0) {
      // Try exact match first
      let layerFound = availableLayers.find((l) => l.id === pendingLayerName);

      // If not found, try matching by layer name suffix (e.g., "namespace:layername" vs "layername")
      if (!layerFound) {
        layerFound = availableLayers.find(
          (l) =>
            l.id.endsWith(`:${pendingLayerName}`) ||
            pendingLayerName.endsWith(`:${l.id}`) ||
            l.id.split(":").pop() === pendingLayerName.split(":").pop()
        );
      }

      if (layerFound) {
        setTimeout(() => {
          setSelectedLayer(layerFound);
          fetchLayerData(layerFound);
          setPendingLayerName(null);
        }, 0);
      } else {
        // Layer not found - clear pending state
        console.log(
          `Layer "${pendingLayerName}" not found in available layers:`,
          availableLayers.map((l) => l.id)
        );
        setPendingLayerName(null);
      }
    }
  }, [availableLayers, pendingLayerName]);

  useEffect(() => {
    const handleProjectionError = (event: any) => {
      console.log("Projection error detected:", event.detail);
      setHasProjectionIssue(true);
    };

    document.addEventListener("projection-error", handleProjectionError);

    return () => {
      document.removeEventListener("projection-error", handleProjectionError);
    };
  }, []);

  // Add a new effect to listen for format error events
  useEffect(() => {
    const handleFormatError = (event: any) => {
      console.log("Format error detected:", event.detail);

      // Only set supportsJsonFormat to false if we've actually confirmed JSON isn't supported
      // Not just because it's not listed in metadata
      if (event.detail && event.detail.jsonAttempted === true) {
        setSupportsJsonFormat(false);
      }
    };

    document.addEventListener("format-error", handleFormatError);

    return () => {
      document.removeEventListener("format-error", handleFormatError);
    };
  }, []);

  // Update URL when WFS is selected
  const updateUrlParameter = (url: string) => {
    if (url === "") {
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("wfs");
        newUrl.searchParams.delete("layer");
        newUrl.searchParams.delete("bbox");
        newUrl.searchParams.delete("filters");

        window.history.pushState(
          { path: newUrl.toString() },
          "",
          newUrl.toString()
        );
      }
      return;
    }

    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("wfs", url);
      window.history.pushState(
        { path: newUrl.toString() },
        "",
        newUrl.toString()
      );
    }
  };

  // Copy current URL to clipboard
  const copyUrlToClipboard = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Determine error type from error message
  const determineErrorType = (
    errorMessage: string
  ): "network" | "auth" | "notFound" | "badRequest" | "server" | "unknown" => {
    if (
      errorMessage.includes("Network Error") ||
      errorMessage.includes("Failed to fetch")
    ) {
      return "network";
    } else if (
      errorMessage.includes("Authentication Error") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      return "auth";
    } else if (
      errorMessage.includes("Not Found") ||
      errorMessage.includes("404")
    ) {
      return "notFound";
    } else if (
      errorMessage.includes("Bad Request") ||
      errorMessage.includes("400")
    ) {
      return "badRequest";
    } else if (
      errorMessage.includes("Server Error") ||
      errorMessage.includes("500")
    ) {
      return "server";
    } else {
      return "unknown";
    }
  };

  // Function to analyze a WFS URL
  // urlBbox and urlFilters are passed from initial URL parsing to avoid stale state issues
  const analyzeWfsUrl = async (
    url: string,
    urlBbox?: BBoxFilter | null,
    urlFilters?: AttributeFilter[]
  ) => {
    if (!url.trim()) {
      setError(t("enterWfsUrl"));
      setErrorType("unknown");
      return;
    }

    const nextUrl = url.trim();
    const isWfsChange =
      lastAnalyzedUrlRef.current !== null &&
      lastAnalyzedUrlRef.current !== nextUrl;

    // Use passed values (for initial load) or current state (for subsequent calls)
    const hasBboxFromUrl = urlBbox !== undefined ? !!urlBbox : !!bboxFilter;
    const hasFiltersFromUrl =
      urlFilters !== undefined
        ? urlFilters.length > 0
        : initialFilters.length > 0;

    // Reset all states
    setError(null);
    setErrorType(null);
    setAnalyzedUrl(nextUrl);
    setIsLoadingLayers(true);
    setAvailableLayers([]);
    setSelectedLayer(null);
    setWfsData(null);
    setFilteredData(null);
    setAttributes([]);
    setTotalFeatureCount(null);
    setHasGeometry(false);
    setSourceProjection("EPSG:4326");
    setIsFiltered(false);
    setHasProjectionIssue(false);
    setFocusedFeature(null);
    setSupportsJsonFormat(true);

    // Clear filters and bbox when WFS changes (not on initial load)
    if (isWfsChange) {
      setBboxFilter(null);
      setActiveFilters([]);
      setInitialFilters([]);
      updateFiltersParameter([]);
      // Clear bbox from URL
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("bbox");
        newUrl.searchParams.delete("filters");
        window.history.pushState(
          { path: newUrl.toString() },
          "",
          newUrl.toString()
        );
      }
    }

    // Update URL parameter (only set wfs param, don't touch others)
    updateUrlParameter(url);

    const cleanUrl = sanitizeWfsUrl(url);

    try {
      // First, fetch the capabilities to get available layers
      const layers = await fetchWfsCapabilities(cleanUrl);
      setAvailableLayers(layers);

      if (layers.length === 0) {
        setError(t("noLayersFound"));
        setErrorType("notFound");
      } else if (layers.length === 1) {
        // If only one layer, select it automatically
        setSelectedLayer(layers[0]);
        // Only auto-fetch if we don't have bbox/filters from URL that need to be applied
        // (those will be handled by the layer auto-select effect after state updates)
        console.log(
          "analyzeWfsUrl: single layer, hasBboxFromUrl:",
          hasBboxFromUrl,
          "hasFiltersFromUrl:",
          hasFiltersFromUrl
        );
        if (!hasBboxFromUrl && !hasFiltersFromUrl) {
          console.log("analyzeWfsUrl: calling fetchLayerData (no URL params)");
          await fetchLayerData(layers[0], cleanUrl);
        } else {
          console.log(
            "analyzeWfsUrl: NOT calling fetchLayerData (will let effect handle with bbox/filters)"
          );
        }
      }
      // If multiple layers, wait for user selection
    } catch (err) {
      console.error("WFS capabilities error:", err);

      // Clear any layer data when there's an error
      setSelectedLayer(null);
      setAvailableLayers([]);
      setWfsData(null);
      setFilteredData(null);

      // Improved error handling with more specific messages
      if (err instanceof Error) {
        setError(err.message);
        setErrorType(determineErrorType(err.message));
      } else {
        setError(t("unknownError"));
        setErrorType("unknown");
      }
    } finally {
      lastAnalyzedUrlRef.current = nextUrl;
      setIsLoadingLayers(false);
    }
  };

  const handleAnalyze = () => {
    analyzeWfsUrl(wfsUrl);
  };

  const handleDatasetSelect = async (dataset: SearchDataset) => {
    const datasetKey = `${dataset.name}-${dataset.mdId || dataset.url}`;
    setDatasetInfoMessage(null);
    setResolvingDatasetKey(datasetKey);

    // Set pending layer if dataset has layers property
    if (dataset.layers && dataset.layers.length > 0) {
      setPendingLayerName(dataset.layers[0]);
    } else {
      setPendingLayerName(null);
    }

    try {
      let urlToAnalyze = dataset.url;
      const shouldResolveCsw =
        Boolean(dataset.mdId && dataset.cswUrl) &&
        (dataset.typ === "wms" || looksLikeWms(dataset.url, "", ""));

      if (shouldResolveCsw && dataset.mdId && dataset.cswUrl) {
        const resolved = await resolveDatasetFromCsw(
          dataset.mdId,
          dataset.cswUrl
        );

        if (!resolved.url) {
          setWmsResolutionState((prev) => ({
            ...prev,
            [datasetKey]: "no-wfs"
          }));
          setDatasetInfoMessage(
            `${dataset.name}: ${
              resolved.unavailableReason ||
              "Only WMS was found for this record."
            }`
          );
          return;
        }

        urlToAnalyze = resolved.url;
        setWmsResolutionState((prev) => ({ ...prev, [datasetKey]: "wfs" }));

        setSearchDatasets((prev) =>
          prev.map((entry) =>
            entry.mdId === dataset.mdId
              ? {
                  ...entry,
                  url: resolved.url,
                  typ: "wfs",
                  unavailableReason: undefined
                }
              : entry
          )
        );
      }

      if (!urlToAnalyze) {
        setDatasetInfoMessage(`${dataset.name}: No WFS URL available.`);
        return;
      }

      const cleanedUrl = sanitizeWfsUrl(urlToAnalyze);
      setWfsUrl(cleanedUrl);
      setShowDatasetDropdown(false);
      analyzeWfsUrl(cleanedUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to resolve dataset record.";
      setWmsResolutionState((prev) => ({ ...prev, [datasetKey]: "no-wfs" }));
      setDatasetInfoMessage(`${dataset.name}: ${message}`);
    } finally {
      setResolvingDatasetKey(null);
    }
  };

  useEffect(() => {
    if (!showDatasetDropdown) return;

    const pendingWms = filteredDatasets.filter((dataset) => {
      const datasetKey = `${dataset.name}-${dataset.mdId || dataset.url}`;
      const isVisible =
        visibleDatasetKeys[datasetKey] ??
        defaultVisibleDatasetKeys.has(datasetKey);

      return (
        dataset.typ === "wms" &&
        Boolean(dataset.mdId && dataset.cswUrl) &&
        isVisible &&
        wmsResolutionState[datasetKey] === undefined
      );
    });

    if (pendingWms.length === 0) return;

    const timers = pendingWms.map((dataset) =>
      window.setTimeout(async () => {
        const datasetKey = `${dataset.name}-${dataset.mdId || dataset.url}`;
        setWmsResolutionState((prev) => ({
          ...prev,
          [datasetKey]: "checking"
        }));

        try {
          const resolved = await resolveDatasetFromCsw(
            dataset.mdId as string,
            dataset.cswUrl as string
          );
          if (resolved.url) {
            setWmsResolutionState((prev) => ({ ...prev, [datasetKey]: "wfs" }));
            setSearchDatasets((prev) =>
              prev.map((entry) =>
                entry.mdId === dataset.mdId
                  ? {
                      ...entry,
                      url: resolved.url,
                      typ: "wfs",
                      unavailableReason: undefined
                    }
                  : entry
              )
            );
          } else {
            setWmsResolutionState((prev) => ({
              ...prev,
              [datasetKey]: "no-wfs"
            }));
            setSearchDatasets((prev) =>
              prev.map((entry) =>
                entry.mdId === dataset.mdId
                  ? {
                      ...entry,
                      unavailableReason:
                        resolved.unavailableReason ||
                        "Only WMS was found in this CSW record."
                    }
                  : entry
              )
            );
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to resolve CSW.";
          setWmsResolutionState((prev) => ({
            ...prev,
            [datasetKey]: "no-wfs"
          }));
          setSearchDatasets((prev) =>
            prev.map((entry) =>
              entry.mdId === dataset.mdId
                ? {
                    ...entry,
                    unavailableReason: message
                  }
                : entry
            )
          );
        }
      }, 500)
    );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [
    defaultVisibleDatasetKeys,
    filteredDatasets,
    showDatasetDropdown,
    visibleDatasetKeys,
    wmsResolutionState
  ]);

  useEffect(() => {
    if (!showDatasetDropdown || !datasetListRef.current) {
      setVisibleDatasetKeys((prev) =>
        Object.keys(prev).length > 0 ? {} : prev
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleDatasetKeys((prev) => {
          const next = { ...prev };
          entries.forEach((entry) => {
            const key = entry.target.getAttribute("data-dataset-key");
            if (!key) return;
            next[key] = entry.isIntersecting;
          });
          return next;
        });
      },
      {
        root: datasetListRef.current,
        threshold: 0.1
      }
    );

    filteredDatasets.forEach((dataset) => {
      const key = `${dataset.name}-${dataset.mdId || dataset.url}`;
      const node = datasetItemRefs.current[key];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [filteredDatasets, showDatasetDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showDatasetDropdown) return;

      const targetNode = event.target as Node;
      if (
        datasetDropdownWrapperRef.current &&
        !datasetDropdownWrapperRef.current.contains(targetNode)
      ) {
        setShowDatasetDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatasetDropdown]);

  // Update the fetchLayerData function to properly pass the URL to fetchLayerDataWithMaxFeatures
  const fetchLayerData = async (layer: LayerInfo, urlOverride?: string) => {
    console.log("fetchLayerData called, current bboxFilter state:", bboxFilter);
    const urlToUse = urlOverride || wfsUrl;
    await fetchLayerDataWithMaxFeatures(
      layer,
      maxFeatures,
      urlToUse,
      bboxFilter
    );
  };

  // Update the handleLayerSelect function to ensure it properly fetches layer data
  const handleLayerSelect = async (layer: LayerInfo) => {
    console.log("Layer selected:", layer);
    setSelectedLayer(layer);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("layer", layer.id);
    window.history.pushState(
      { path: newUrl.toString() },
      "",
      newUrl.toString()
    );

    await fetchLayerData(layer);
  };

  const handleMaxFeaturesChange = async (newMaxFeatures: number) => {
    console.log("Max features changed from", maxFeatures, "to", newMaxFeatures);

    // Set the updating flag to true
    setIsMaxFeaturesUpdating(true);

    // Reset states that should be updated with new data
    setWfsData(null);
    setFilteredData(null);
    setFocusedFeature(null);
    setAttributes([]);
    setSelectedAttribute(null);
    setIsFiltered(false);

    // Update the max features state
    setMaxFeatures(newMaxFeatures);

    // Only refetch if we have a selected layer
    if (selectedLayer) {
      try {
        // Pass the new max features value directly to ensure it's used immediately
        await fetchLayerDataWithMaxFeatures(
          selectedLayer,
          newMaxFeatures,
          wfsUrl,
          bboxFilter
        );
      } catch (error) {
        console.error("Error fetching data after max features change:", error);
        setError(t("maxFeaturesUpdateError"));
        setErrorType("unknown");
      } finally {
        setIsMaxFeaturesUpdating(false);
      }
    } else {
      setIsMaxFeaturesUpdating(false); // Reset the flag if no layer is selected
    }
  };

  // Add this new helper function after the handleMaxFeaturesChange function
  // Update the fetchLayerDataWithMaxFeatures function to accept and use the URL parameter
  const fetchLayerDataWithMaxFeatures = async (
    layer: LayerInfo,
    maxFeaturesValue: number,
    urlOverride?: string,
    bbox?: BBoxFilter | null
  ) => {
    console.log("fetchLayerDataWithMaxFeatures called with bbox:", bbox);
    console.trace("fetchLayerDataWithMaxFeatures stack trace");
    setIsLoading(true);
    setError(null);
    setErrorType(null);
    setHasGeometry(false);
    setIsFiltered(false);
    setHasProjectionIssue(false); // Reset projection issue flag
    setFocusedFeature(null); // Reset focused feature
    setAttributes([]); // Reset attributes
    setSelectedAttribute(null); // Reset selected attribute

    // Use the provided URL override or fall back to the state URL
    const urlToUse = urlOverride || wfsUrl;

    try {
      // First try to get the total feature count (with bbox if provided)
      setIsLoadingCount(true);
      try {
        const count = await fetchFeatureCount(
          urlToUse,
          layer.id,
          layer,
          bbox || undefined
        );
        setTotalFeatureCount(count);
      } catch (countError) {
        console.error("Error fetching feature count:", countError);
        setTotalFeatureCount(null);
      } finally {
        setIsLoadingCount(false);
      }

      // Then fetch the actual data with the provided maxFeatures limit and bbox
      // Use the layer's default projection first, then convert to WGS84 if needed
      console.log(
        `Fetching data with max features: ${maxFeaturesValue}${bbox ? ` and bbox filter` : ""}`
      );
      const {
        data,
        attributes: fetchedAttributes,
        sourceProjection
      } = await fetchWfsData(
        urlToUse,
        layer.id,
        maxFeaturesValue,
        layer,
        bbox || undefined
      );

      let detectedProjection = sourceProjection;
      if (data?.features && data?.features?.length) {
        const isWGS84 = isLikelyWGS84(data?.features[0]);
        if (isWGS84) {
          detectedProjection = "EPSG:4326";
        }
      }
      // reroject
      const normalizedProj = normalizeProjectionCode(detectedProjection);
      if (normalizedProj !== "EPSG:4326") {
        if (data?.features && data?.features?.length)
          data.features.forEach((f) =>
            reprojectGeometry(f.geometry, normalizedProj, "EPSG:4326")
          );
      }

      setWfsData(data);
      setFilteredData(data); // Initialize filtered data with all data
      setAttributes(fetchedAttributes);
      setSourceProjection(detectedProjection || "EPSG:4326");

      console.log(
        `Data fetched with source projection: ${
          detectedProjection || "EPSG:4326"
        }`
      );
      if (detectedProjection && detectedProjection !== "EPSG:4326") {
        console.log(
          `Data will be reprojected from ${detectedProjection} to EPSG:4326 for display and download`
        );
      }

      // Check if the data has valid geometry
      const hasValidGeometry = data.features.some(
        (f: any) =>
          f.geometry &&
          f.geometry.coordinates &&
          Array.isArray(f.geometry.coordinates) &&
          f.geometry.coordinates.length > 0
      );
      setHasGeometry(hasValidGeometry);

      if (fetchedAttributes.length > 0) {
        setSelectedAttribute(fetchedAttributes[0]);
      }
    } catch (err) {
      console.error("Error fetching WFS data:", err);
      if (err instanceof Error) {
        setError(err.message);
        setErrorType(determineErrorType(err.message));
      } else {
        setError(t("fetchDataError"));
        setErrorType("unknown");
      }
      setWfsData(null);
      setFilteredData(null);
      setAttributes([]);
    } finally {
      setIsLoading(false);
      setIsMaxFeaturesUpdating(false); // Reset the updating flag
    }
  };

  // Track if we're applying initial filters (to avoid URL update loop)
  const isApplyingInitialFilters = useRef(false);

  // Handle filter changes
  const handleFilterChange = (
    newFilteredData: any,
    filters: FilterCondition[]
  ) => {
    if (newFilteredData && wfsData) {
      // Add total feature count to the filtered data
      newFilteredData.totalFeatures = wfsData.features.length;
    }

    setFilteredData(newFilteredData);
    setIsFiltered(
      newFilteredData &&
        wfsData &&
        newFilteredData.features.length !== wfsData.features.length
    );
    const normalizedFilters = filters || [];
    setActiveFilters(normalizedFilters);

    // Only update URL if not applying initial filters from URL
    if (!isApplyingInitialFilters.current) {
      updateFiltersParameter(normalizedFilters);
    } else {
      // Clear the flag after initial filters have been applied
      isApplyingInitialFilters.current = false;
    }
  };

  // Handle bbox filter changes
  const handleBboxChange = async (newBbox: BBoxFilter | null) => {
    setBboxFilter(newBbox);

    // Update URL params
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (newBbox) {
        // Store bbox as minx,miny,maxx,maxy
        const bboxParam = `${newBbox.minx},${newBbox.miny},${newBbox.maxx},${newBbox.maxy}`;
        newUrl.searchParams.set("bbox", bboxParam);
      } else {
        newUrl.searchParams.delete("bbox");
      }
      window.history.pushState(
        { path: newUrl.toString() },
        "",
        newUrl.toString()
      );
    }

    // Refetch data with new bbox if we have a selected layer
    if (selectedLayer) {
      await fetchLayerDataWithMaxFeatures(
        selectedLayer,
        maxFeatures,
        wfsUrl,
        newBbox
      );
    }
  };

  // Handle example dataset selection
  const handleSelectExampleDataset = (url: string) => {
    // First set the URL
    setWfsUrl(url);
    // Then analyze the URL
    analyzeWfsUrl(url);
    // Hide examples after selection
    setShowExamples(false);
  };

  // Clear previous data when switching between example datasets
  useEffect(() => {
    if (wfsUrl) {
      // Reset all data states when URL changes
      setWfsData(null);
      setFilteredData(null);
      setAttributes([]);
      setSelectedLayer(null);
      setTotalFeatureCount(null);
      setHasGeometry(false);
      setSourceProjection("EPSG:4326");
      setIsFiltered(false);
      setHasProjectionIssue(false);
      setFocusedFeature(null);
      setError(null);
      setErrorType(null);
    }
  }, [wfsUrl]);

  // Clear previous data when switching between layers
  const prevSelectedLayerRef = useRef<LayerInfo | null | undefined>(undefined);
  useEffect(() => {
    // Only run cleanup when layer changes FROM a value TO null (not on initial load)
    const wasLayerSelected =
      prevSelectedLayerRef.current !== undefined &&
      prevSelectedLayerRef.current !== null;
    prevSelectedLayerRef.current = selectedLayer;

    if (selectedLayer === null && wasLayerSelected) {
      // Reset all data states when layer is deselected
      setWfsData(null);
      setFilteredData(null);
      setAttributes([]);
      setTotalFeatureCount(null);
      setHasGeometry(false);
      setSourceProjection("EPSG:4326");
      setIsFiltered(false);
      setHasProjectionIssue(false);
      setFocusedFeature(null);
      setError(null);
      setErrorType(null);
      setBboxFilter(null); // Reset bbox when layer changes
      setActiveFilters([]); // Reset active filters when layer changes
      setInitialFilters([]); // Reset initial filters when layer changes

      // Clear bbox and filters from URL when layer is deselected
      if (typeof window !== "undefined") {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("bbox");
        newUrl.searchParams.delete("filters");
        window.history.pushState(
          { path: newUrl.toString() },
          "",
          newUrl.toString()
        );
      }
    }
  }, [selectedLayer]);

  // Move conditional logic inside the useEffect hook
  useEffect(() => {
    if (hasProjectionIssue) {
      console.log("A projection issue exists.");
    }
  }, [hasProjectionIssue]);

  // Add a handler function for viewing a feature on the map
  const handleViewFeatureOnMap = (feature: any) => {
    setFocusedFeature(feature);

    // Scroll to the map container
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  // Add a handler to clear the focused feature
  const handleClearFocusedFeature = () => {
    setFocusedFeature(null);
  };

  // Render error message based on error type
  const renderErrorMessage = () => {
    if (!error) return null;

    let icon = <AlertCircle className="h-5 w-5" />;
    let title = t("errorTitle");
    let bgColor = "bg-destructive/5";
    let borderColor = "border-destructive/20";
    let textColor = "text-destructive";

    if (errorType === "badRequest") {
      icon = <AlertTriangle className="h-5 w-5 text-amber-600" />;
      title = t("invalidWfsUrl");
      bgColor = "bg-amber-50";
      borderColor = "border-amber-300";
      textColor = "text-amber-800";
    } else if (errorType === "notFound") {
      icon = <AlertTriangle className="h-5 w-5 text-amber-600" />;
      title = t("wfsServiceNotFound");
      bgColor = "bg-amber-50";
      borderColor = "border-amber-300";
      textColor = "text-amber-800";
    } else if (errorType === "auth") {
      icon = <AlertTriangle className="h-5 w-5 text-amber-600" />;
      title = t("authenticationRequired");
      bgColor = "bg-amber-50";
      borderColor = "border-amber-300";
      textColor = "text-amber-800";
    } else if (errorType === "network") {
      icon = <AlertTriangle className="h-5 w-5 text-amber-600" />;
      title = t("networkError");
      bgColor = "bg-amber-50";
      borderColor = "border-amber-300";
      textColor = "text-amber-800";
    } else if (errorType === "server") {
      icon = <AlertCircle className="h-5 w-5 text-red-600" />;
      title = t("serverError");
      bgColor = "bg-red-50";
      borderColor = "border-red-300";
      textColor = "text-red-800";
    }

    return (
      <Alert className={`mb-6 ${bgColor} border-${borderColor}`}>
        {icon}
        <AlertTitle className={`text-lg ${textColor}`}>{title}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className={`text-base ${textColor}`}>{error}</p>

          {(errorType === "badRequest" ||
            errorType === "notFound" ||
            errorType === "network") && (
            <div className="mt-4 p-3 bg-white rounded-md border border-amber-200">
              <p className="font-medium text-amber-800">
                {t("troubleshootingSuggestions")}
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-amber-700">
                <li>{t("checkUrlTypos")}</li>
                <li>{t("verifyValidWfs")}</li>
                <li>{t("checkServerOnline")}</li>
                <li>{t("tryAddingWfs")}</li>
                <li>{t("tryExampleDatasets")}</li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-50"
                onClick={() => setShowExamples(true)}
              >
                {t("showExampleDatasets")}
              </Button>
            </div>
          )}

          {error.includes("CORS") && (
            <div className="bg-destructive/10 p-3 rounded-md text-sm">
              <p className="font-semibold flex items-center gap-1">
                <Info className="h-4 w-4" /> {t("corsIssueDetected")}
              </p>
              <p className="mt-1">{t("corsDescription")}</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>{t("corsOption1")}</li>
                <li>{t("corsOption2")}</li>
                <li>{t("corsOption3")}</li>
              </ul>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  // It's important to return something, even if it's null
  return (
    <div className="min-h-screen bg-odis-light-2">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl">
        {/* Header with logo and language switcher */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            {/* <div className="w-12 h-12 rounded-full bg-[#1a3a8f] flex items-center justify-center mr-3">
              <WandSparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--primary-color)]">
                {t("appTitle")}
              </h1>
              <p className="text-sm text-gray-600 font-light">{t("appSubtitle")}</p>
            </div> */}

            <a href="https://odis-berlin.de/" target="_blank">
              <img
                src={"/logo-odis.svg"}
                width="200"
                height="100"
                alt="Odis logo"
              />
            </a>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Main content area with white background */}
        <div className="bg-white rounded-xl p-8 md:p-12 mb-8 shadow-lg">
          {/* Description */}
          <div className="mb-6 relative">
            <div>
              <div className="w-full md:w-1/2">
                <h1 className="text-3xl font-bold text-odis-dark mb-2">
                  WFS<span className="text-odis-light">Explorer</span>
                  <p className="text-sm pb-2 italic">aka WFS-Wizard</p>
                </h1>

                <img
                  className="w-6 sm:w-10 md:w-16"
                  style={{
                    position: "absolute",
                    right: "0px",
                    top: "-5px"
                    // width: "85px",
                    // transform: "rotateY(180deg)",
                  }}
                  src="./magicglobe3.svg"
                  alt=""
                />

                {/* </h2> */}
                <p className="mb-2">
                  {t("toolDescription1")}{" "}
                  <span
                    data-tooltip-id="url-tooltip"
                    data-tooltip-content={t("wfsDataInfo")}
                    className="decoration-odis-light decoration-dotted underline decoration-2 underline-offset-2"
                  >
                    {t("wfsData")}
                  </span>{" "}
                  {t("toolDescription2")}
                </p>
                <Tooltip
                  id="url-tooltip"
                  style={{
                    maxWidth: "250px",
                    backgroundColor: "#4c68c7",
                    color: "white",
                    zIndex: 30
                  }}
                />
              </div>
              {/* <div className="w-full md:w-1/2">
                <img
                  className="w-20"
                  style={{
                    // position: "absolute",
                    // right: "0px",
                    // top: "-15px",
                    width: "65px",
                    // transform: "rotateY(180deg)",
                  }}
                  src="./magicglobe3.svg"
                  alt=""
                />
              </div> */}
            </div>
            {/* Feature overview with icons only by default */}

            {/* Search input */}
            <div className="relative" ref={datasetDropdownWrapperRef}>
              <div className="flex border rounded-lg overflow-hidden">
                <div className="relative flex-grow">
                  <Input
                    id="wfs-url"
                    placeholder={
                      searchDatasets[0]
                        ? t("wfsUrlPlaceholderSearch")
                        : t("wfsUrlPlaceholder")
                    }
                    value={wfsUrl}
                    onChange={(e) => {
                      setWfsUrl(e.target.value);
                      if (datasetsParamUrl) {
                        setShowDatasetDropdown(true);
                        setDatasetInfoMessage(null);
                      }
                      updateUrlParameter("");

                      if (e.target.value.trim() !== analyzedUrl) {
                        setSelectedLayer(null);
                        setAvailableLayers([]);
                        setWfsData(null);
                        setFilteredData(null);
                        setAttributes([]);
                        setTotalFeatureCount(null);
                        setHasGeometry(false);
                        setSourceProjection("EPSG:4326");
                        setIsFiltered(false);
                        setHasProjectionIssue(false);
                        setFocusedFeature(null);
                        setError(null);
                        setErrorType(null);
                      }
                    }}
                    onFocus={() => {
                      if (datasetsParamUrl && searchDatasets.length > 0) {
                        setShowDatasetDropdown(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setShowDatasetDropdown(false);
                        handleAnalyze();
                      } else if (e.key === "Escape") {
                        setShowDatasetDropdown(false);
                      }
                    }}
                    className="py-6 px-4 pr-20 text-lg border-0 focus-visible:ring-1 focus-visible:ring-[#1a3a8f] focus-visible:ring-offset-0 rounded-l-md !rounded-r-none"
                  />

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {datasetsParamUrl && searchDatasets.length > 0 && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowDatasetDropdown((prev) => !prev)}
                        className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-700"
                        aria-label="Toggle dataset dropdown"
                      >
                        {showDatasetDropdown ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {wfsUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setWfsUrl("");
                          setShowDatasetDropdown(false);
                          setSelectedLayer(null);
                          setAvailableLayers([]);
                          setWfsData(null);
                          setFilteredData(null);
                          setAttributes([]);
                          setTotalFeatureCount(null);
                          setHasGeometry(false);
                          setSourceProjection("EPSG:4326");
                          setIsFiltered(false);
                          setHasProjectionIssue(false);
                          setFocusedFeature(null);
                          setError(null);
                          setErrorType(null);
                          setAnalyzedUrl("");
                          updateUrlParameter("");
                        }}
                        className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-700"
                        aria-label="Clear input"
                      >
                        {/* <X className="h-4 w-4" /> */}
                      </button>
                    )}
                  </div>

                  {wfsUrl && (
                    <button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => {
                        setWfsUrl("");
                        setShowDatasetDropdown(false);
                        // Clear all data when input is cleared
                        setSelectedLayer(null);
                        setAvailableLayers([]);
                        setWfsData(null);
                        setFilteredData(null);
                        setAttributes([]);
                        setTotalFeatureCount(null);
                        setHasGeometry(false);
                        setSourceProjection("EPSG:4326");
                        setIsFiltered(false);
                        setHasProjectionIssue(false);
                        setFocusedFeature(null);
                        setError(null);
                        setErrorType(null);
                        setAnalyzedUrl("");
                        updateUrlParameter("");
                      }}
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
                <Button
                  className="h-auto bg-odis-light hover:bg-active hover:!text-odis-dark text-white !rounded-l-none"
                  onClick={handleAnalyze}
                  disabled={
                    isLoadingLayers ||
                    isLoading ||
                    (wfsUrl.trim() === analyzedUrl && analyzedUrl !== "")
                  }
                >
                  {isLoadingLayers ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : wfsUrl.trim() === analyzedUrl &&
                    analyzedUrl !== "" &&
                    !error ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      {t("loaded")}
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      {t("analyzeButton")}
                    </>
                  )}
                </Button>
              </div>

              {datasetsParamUrl && showDatasetDropdown && (
                <div className="absolute mt-1 w-full rounded-md border bg-white shadow-lg z-[100]">
                  <div ref={datasetListRef} className="max-h-64 overflow-auto">
                    {isDatasetsLoading ? (
                      <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loadingDatasets")}
                      </div>
                    ) : datasetsError ? (
                      <div className="p-3 text-sm text-red-700">
                        {datasetsError}
                      </div>
                    ) : filteredDatasets.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500">
                        {t("noMatchSearch")}
                      </div>
                    ) : (
                      filteredDatasets.map((dataset, i) => {
                        const datasetKey = `${dataset.name}-${
                          dataset.mdId || dataset.url
                        }`;
                        const isResolving = resolvingDatasetKey === datasetKey;
                        const wmsStatus =
                          dataset.typ === "wms"
                            ? wmsResolutionState[datasetKey] || "unchecked"
                            : null;
                        const isDisabled =
                          isResolving ||
                          (dataset.typ === "wms" && wmsStatus === "no-wfs");
                        return (
                          <button
                            key={datasetKey + i}
                            ref={(node) => {
                              datasetItemRefs.current[datasetKey] = node;
                            }}
                            data-dataset-key={datasetKey}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleDatasetSelect(dataset)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 border-b last:border-b-0 disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isDisabled}
                          >
                            <div className="font-medium text-sm text-slate-900 flex items-center justify-between gap-2">
                              {dataset.name || "Unnamed dataset"}
                              {dataset.typ === "wms" && (
                                <span className="text-xs font-semibold">
                                  {wmsStatus === "unchecked"
                                    ? ""
                                    : wmsStatus === "checking"
                                      ? ""
                                      : wmsStatus === "wfs"
                                        ? ""
                                        : t("noWFSAvailable")}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 break-all">
                              {isResolving
                                ? "Resolving CSW record..."
                                : dataset.typ === "wms" &&
                                    wmsStatus === "no-wfs"
                                  ? dataset.unavailableReason ||
                                    "No WFS alternative found."
                                  : dataset.url || "Resolve from CSW record"}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            {datasetInfoMessage && (
              <div className="mt-2 text-xs text-amber-700">
                {datasetInfoMessage}
              </div>
            )}

            {/* Example datasets - collapsible */}
            <div className="mt-1">
              <button
                className="text-odis-light  hover:text-odis-dark  hover:bg-white p-2 h-auto flex items-center text-sm"
                onClick={() => setShowExamples(!showExamples)}
              >
                {showExamples ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                {showExamples
                  ? t("hideExampleDatasets")
                  : t("showExampleDatasets")}
              </button>
              {showExamples && (
                <div className="mt-2 p-3 bg-odis-extra-light rounded-md">
                  <p className="text-sm mb-2">
                    {t("exampleDatasetsDescription")}{" "}
                    <a
                      href="https://geoexplorer.odis-berlin.de/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-odis-light"
                    >
                      GeoExplorer
                    </a>
                    {"."}
                  </p>
                  <ExampleDatasets
                    onSelectDataset={handleSelectExampleDataset}
                  />
                </div>
              )}
            </div>

            <div className="">
              <div className="flex flex-col">
                {wfsUrl.trim() === analyzedUrl &&
                analyzedUrl !== "" &&
                !error ? (
                  <></>
                ) : (
                  <>
                    <div className="mt-8">
                      <h3 className="text-xs font-semibold text-slate-500 tracking-wide uppercase mb-3">
                        {t("features")}
                      </h3>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 sm:gap-y-2 gap-x-6 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                          <Info className="h-4 w-4 mt-[2px] text-slate-400" />
                          <span>{t("metadataInfo")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Map className="h-4 w-4 mt-[2px] text-slate-400" />
                          <span>{t("mapVisualization")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Filter className="h-4 w-4 mt-[2px] text-slate-400" />
                          <span>{t("filtering")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BarChart3 className="h-4 w-4 mt-[2px] text-slate-400" />
                          <span>{t("statisticsTitle")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Globe className="h-4 w-4 mt-[2px] text-slate-400" />
                          <span>{t("wgs84Conversion")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Download className="h-4 w-4 mt-[2px] text-slate-400" />
                          <span>{t("dataDownload")}</span>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error messages */}
          {renderErrorMessage()}

          {selectedLayer && !supportsJsonFormat && !error && (
            <Alert
              variant="warning"
              className="bg-amber-50 border-amber-200 mb-6"
            >
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                {t("jsonFormatNotSupported")}
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                <p>{t("jsonFormatNotSupportedDesc")}</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>{t("mapPreviewUnavailable")}</li>
                  <li>{t("dataDownloadUnavailable")}</li>
                  <li>{t("attributeStatisticsUnavailable")}</li>
                </ul>
                <p className="mt-2">{t("limitedFunctionality")}</p>
              </AlertDescription>
            </Alert>
          )}

          {availableLayers.length > 0 && !selectedLayer && !error && (
            <div className="relative z-50 mb-6">
              <LayerSelector
                layers={availableLayers}
                onSelectLayer={handleLayerSelect}
                isLoading={isLoading}
              />
            </div>
          )}

          {(isLoading || isMaxFeaturesUpdating) && (
            <div className="flex justify-center items-center py-12">
              <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-odis-light mb-4" />
                <p className="text-gray-700 font-medium">
                  {isMaxFeaturesUpdating
                    ? t("updatingFeatures").replace(
                        "{count}",
                        maxFeatures.toString()
                      )
                    : t("loadingLayerData")}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {t("loadingTimeWarning")}
                </p>
              </div>
            </div>
          )}

          {filteredData && !error && (
            <div className="space-y-8">
              {/* Active Service/Layer Title & Actions */}
              {selectedLayer && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-odis-light pl-4 py-1 mb-2">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                      {t("activeDataset")}
                    </p>
                    <h2 className="text-2xl font-bold text-slate-800 leading-tight capitalize">
                      {selectedLayer.title || selectedLayer.id}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {availableLayers.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 border-slate-200 h-9 transition-colors bg-background hover:text-accent-foreground hover:bg-active-light"
                        onClick={() => {
                          setSelectedLayer(null);
                          const newUrl = new URL(window.location.href);
                          newUrl.searchParams.delete("layer");
                          window.history.pushState(
                            { path: newUrl.toString() },
                            "",
                            newUrl.toString()
                          );
                        }}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        {t("changeLayer")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 border-slate-200 h-9 transition-colors bg-background hover:text-accent-foreground hover:bg-active-light"
                      onClick={copyUrlToClipboard}
                      title={t("shareWfs")}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                      <span>{isCopied ? t("copied") : t("share")}</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* 1. Map View - Always shown */}
              {hasGeometry && !hasProjectionIssue && (
                <div ref={mapContainerRef} data-map-container className="mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="tracking-tight flex items-center text-lg font-medium">
                        <Map className="h-5 w-5 mr-2 text-[var(--primary-color)]" />
                        {t("mapVisualization")}
                      </CardTitle>
                      <CardDescription>
                        {t("mapPreviewDescription")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 h-[500px]">
                      <MapPreview
                        data={filteredData}
                        sourceProjection={sourceProjection}
                        focusFeature={focusedFeature}
                        onClearFocus={handleClearFocusedFeature}
                        onFeatureClick={handleViewFeatureOnMap}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              <FeatureCountSelector
                maxFeatures={maxFeatures}
                onMaxFeaturesChange={handleMaxFeaturesChange}
                totalFeatureCount={totalFeatureCount}
                isLoadingCount={isLoadingCount || isMaxFeaturesUpdating}
              />

              {/* Only show layer information if there's no error */}
              {selectedLayer && !error ? (
                <div className="space-y-4 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="tracking-tight flex items-center text-lg font-medium">
                        <AlertCircle className="h-5 w-5 mr-2 text-odis-light" />
                        {t("metadataInfo")}
                      </CardTitle>
                      <CardDescription>
                        {t("interactiveMetadataInfoDescription")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-odis-extra-light pt-4 border-t text-sm rounded-b-lg">
                      <div className="flex flex-col gap-3">
                        <>
                          {/* Desktop/Table Layout (shown on md and up) */}
                          <table className="hidden md:table table-auto w-full text-left border-collapse">
                            <tbody>
                              <tr>
                                <th className="pr-4 align-top pb-2 font-normal">
                                  {t("layerName")}
                                </th>
                                <td className="font-bold align-top text-gray-600 ">
                                  {selectedLayer.title || selectedLayer.id}
                                </td>
                              </tr>

                              {selectedLayer.abstract && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("layerDescription")}
                                  </th>
                                  <td className="text-gray-600 align-top font-light">
                                    {selectedLayer.abstract}
                                  </td>
                                </tr>
                              )}

                              {selectedLayer.keywords?.length > 0 && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("keywords")}
                                  </th>
                                  <td className="text-gray-600 align-top font-light">
                                    {selectedLayer.keywords.join(", ")}
                                  </td>
                                </tr>
                              )}

                              {(selectedLayer.contactPerson ||
                                selectedLayer.contactOrganization ||
                                selectedLayer.contactEmail) && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("contact")}
                                  </th>
                                  <td className="text-gray-600 align-top font-light">
                                    {selectedLayer.contactPerson &&
                                      `${selectedLayer.contactPerson}, `}
                                    {selectedLayer.contactOrganization &&
                                      `${selectedLayer.contactOrganization}, `}
                                    {selectedLayer.contactEmail}
                                  </td>
                                </tr>
                              )}

                              {selectedLayer.fees && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("fees")}
                                  </th>
                                  <td className="text-gray-600 align-top font-light">
                                    {selectedLayer.fees}
                                  </td>
                                </tr>
                              )}

                              {selectedLayer.accessConstraints && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("accessConstraints")}
                                  </th>
                                  <td className="text-gray-600 align-top font-light">
                                    {selectedLayer.accessConstraints}
                                  </td>
                                </tr>
                              )}

                              {selectedLayer.metadataUrl && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("metadataUrl")}
                                  </th>
                                  <td>
                                    <a
                                      href={selectedLayer.metadataUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-odis-light hover:underline inline-flex items-center"
                                    >
                                      {t("viewFullMetadata")}
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                  </td>
                                </tr>
                              )}

                              {selectedLayer.bounds && (
                                <tr>
                                  <th className="pr-4 align-top pb-2 font-normal">
                                    {t("bounds")}
                                  </th>
                                  <td className="text-gray-600 align-top font-light">
                                    minX: {selectedLayer.bounds.minx}, minY:{" "}
                                    {selectedLayer.bounds.miny}, maxX:{" "}
                                    {selectedLayer.bounds.maxx}, maxY:{" "}
                                    {selectedLayer.bounds.maxy}
                                    {selectedLayer.bounds.crs &&
                                      ` (${selectedLayer.bounds.crs})`}
                                  </td>
                                </tr>
                              )}

                              <tr>
                                <th className="pr-4 align-top pb-2 font-normal">
                                  {t("displayProjection")}
                                </th>
                                <td className="text-gray-600 align-top font-light">
                                  WGS84 (EPSG:4326)
                                </td>
                              </tr>

                              <tr>
                                <th className="pr-4 align-top pb-2 font-normal">
                                  {t("sourceProjection")}
                                </th>
                                <td className="text-gray-600 align-top font-light">
                                  {sourceProjection}
                                </td>
                              </tr>

                              <tr>
                                <th className="pr-4 align-top pb-2 font-normal">
                                  {t("numberOfAttributes")}
                                </th>
                                <td className="text-gray-600 align-top font-light">
                                  {attributes.length}
                                </td>
                              </tr>

                              <tr>
                                <th className="pr-4 align-top pb-2 font-normal">
                                  {t("geometryType")}
                                </th>
                                <td className="text-gray-600 align-top font-light">
                                  {hasGeometry
                                    ? filteredData.features[0]?.geometry
                                        ?.type || t("unknown")
                                    : t("noGeometry")}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Mobile/Fallback Layout (shown below md) */}
                          <div className="md:hidden space-y-4">
                            <div>
                              <span>{t("layerName")}</span>
                              <p className="text-gray-900 font-light">
                                {selectedLayer.title || selectedLayer.id}
                              </p>
                            </div>

                            {selectedLayer.abstract && (
                              <div>
                                <span>{t("layerDescription")}</span>
                                <p className="text-gray-900 font-light">
                                  {selectedLayer.abstract}
                                </p>
                              </div>
                            )}

                            {selectedLayer.keywords?.length > 0 && (
                              <div>
                                <span>{t("keywords")}</span>
                                <p className="text-gray-900 font-light">
                                  {selectedLayer.keywords.join(", ")}
                                </p>
                              </div>
                            )}

                            {(selectedLayer.contactPerson ||
                              selectedLayer.contactOrganization ||
                              selectedLayer.contactEmail) && (
                              <div>
                                <span>{t("contact")}</span>
                                <p className="text-gray-900 font-light">
                                  {selectedLayer.contactPerson &&
                                    `${selectedLayer.contactPerson}, `}
                                  {selectedLayer.contactOrganization &&
                                    `${selectedLayer.contactOrganization}, `}
                                  {selectedLayer.contactEmail}
                                </p>
                              </div>
                            )}

                            {selectedLayer.fees && (
                              <div>
                                <span>{t("fees")}</span>
                                <p className="text-gray-900 font-light">
                                  {selectedLayer.fees}
                                </p>
                              </div>
                            )}

                            {selectedLayer.accessConstraints && (
                              <div>
                                <span>{t("accessConstraints")}</span>
                                <p className="text-gray-900 font-light">
                                  {selectedLayer.accessConstraints}
                                </p>
                              </div>
                            )}

                            {selectedLayer.metadataUrl && (
                              <div>
                                <span>{t("metadataUrl")}</span>
                                <a
                                  href={selectedLayer.metadataUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-odis-light hover:underline inline-flex items-center"
                                >
                                  {t("viewFullMetadata")}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            )}

                            {selectedLayer.bounds && (
                              <div>
                                <span>{t("bounds")}</span>
                                <p className="text-gray-900 font-light">
                                  minX: {selectedLayer.bounds.minx}, minY:{" "}
                                  {selectedLayer.bounds.miny}, maxX:{" "}
                                  {selectedLayer.bounds.maxx}, maxY:{" "}
                                  {selectedLayer.bounds.maxy}
                                  {selectedLayer.bounds.crs &&
                                    ` (${selectedLayer.bounds.crs})`}
                                </p>
                              </div>
                            )}

                            <div>
                              <span>{t("displayProjection")}</span>
                              <p className="text-gray-900 font-light">
                                WGS84 (EPSG:4326)
                              </p>
                            </div>

                            <div>
                              <span>{t("sourceProjection")}</span>
                              <p className="text-gray-900 font-light">
                                {sourceProjection}
                              </p>
                            </div>

                            {/* Number of Attributes */}
                            <div>
                              <span>{t("numberOfAttributes")}</span>
                              <p className="text-gray-900 font-light">
                                {attributes.length}
                              </p>
                            </div>

                            {/* Geometry Type */}
                            <div>
                              <span>{t("geometryType")}</span>
                              <p className="text-gray-900 font-light">
                                {hasGeometry
                                  ? filteredData.features[0]?.geometry?.type ||
                                    t("unknown")
                                  : t("noGeometry")}
                              </p>
                            </div>
                          </div>
                        </>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {/* 2. Filter Options */}
              <div className="mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="tracking-tight flex items-center text-lg font-medium">
                      <Filter className="h-5 w-5 mr-2 text-[var(--primary-color)]" />
                      {t("filtering")}
                    </CardTitle>
                    <CardDescription>
                      {t("advancedFilteringDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Bbox Filter */}
                    <div className="mb-4 pb-4 border-b">
                      <BboxFilter
                        bbox={bboxFilter}
                        onBboxChange={handleBboxChange}
                        layerBounds={selectedLayer?.bounds}
                      />
                    </div>

                    {/* Attribute Filter */}
                    <AttributeFilter
                      data={wfsData}
                      attributes={attributes}
                      onFilterChange={(newFilteredData, filters) =>
                        handleFilterChange(newFilteredData, filters)
                      }
                      initialFilters={initialFilters}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* 3. Data Explorer with Tabs for Attribute Explorer and Statistics */}
              <div className="mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="tracking-tight flex items-center text-lg font-medium">
                      <BarChart3 className="h-5 w-5 mr-2 text-[var(--primary-color)]" />
                      {t("statisticsTitle")}
                    </CardTitle>
                    <CardDescription>
                      {t("dataExplorerDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="explorer" className="w-full">
                      <TabsList className="mb-4">
                        <TabsTrigger value="explorer" className="text-sm">
                          <TableOfContents className="h-4 w-4 mr-2" />
                          {t("attributeExplorer")}
                        </TabsTrigger>
                        <TabsTrigger value="statistics" className="text-sm">
                          <Sigma className="h-4 w-4 mr-2" />
                          {t("statistics")}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="explorer">
                        <AttributeExplorer
                          data={filteredData}
                          attributes={attributes}
                          selectedAttribute={selectedAttribute}
                          onSelectAttribute={setSelectedAttribute}
                          onViewFeatureOnMap={
                            hasGeometry ? handleViewFeatureOnMap : undefined
                          }
                        />
                      </TabsContent>

                      <TabsContent value="statistics">
                        <AttributeStats
                          data={filteredData}
                          attributes={attributes}
                          selectedAttribute={selectedAttribute}
                          onSelectAttribute={setSelectedAttribute}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* 4. Download Options */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="tracking-tight flex items-center text-lg font-medium">
                      <Download className="h-5 w-5 mr-2 text-[var(--primary-color)]" />
                      {t("dataDownload")}
                    </CardTitle>
                    <CardDescription>
                      {t("dataDownloadDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {selectedLayer && (
                        <DownloadOptions
                          wfsUrl={wfsUrl}
                          layer={selectedLayer}
                          maxFeatures={maxFeatures}
                          projectionIssue={hasProjectionIssue}
                          totalFeatureCount={totalFeatureCount}
                          loadedFeatureCount={
                            filteredData?.features?.length || 0
                          }
                          sourceProjection={sourceProjection}
                        />
                      )}

                      {isFiltered && selectedLayer && (
                        <DownloadFilteredOptions
                          filteredData={filteredData}
                          layerId={selectedLayer.id}
                          isFiltered={isFiltered}
                          projectionIssue={hasProjectionIssue}
                          filterCount={activeFilters?.length || 0} // Pass the actual filter count
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
