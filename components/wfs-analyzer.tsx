"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "react-tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from "lucide-react";
import {
  fetchWfsCapabilities,
  fetchWfsData,
  fetchFeatureCount,
  type LayerInfo,
} from "@/lib/wfs-service";
import { LayerSelector } from "@/components/layer-selector";
import { FeatureCountSelector } from "@/components/feature-count-selector";
import { AttributeExplorer } from "@/components/attribute-explorer";
import { AttributeStats } from "@/components/attribute-stats";
import {
  AttributeFilter,
  type FilterCondition,
} from "@/components/attribute-filter";
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
  isLikelyWGS84,
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
  ),
});

// Change to default export
export default function WfsAnalyzer() {
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
  const [initialFilters, setInitialFilters] = useState<FilterCondition[]>([]);

  const updateFiltersParameter = (filters: FilterCondition[]) => {
    if (typeof window === "undefined") return;

    const newUrl = new URL(window.location.href);

    if (!filters.length) {
      newUrl.searchParams.delete("filters");
    } else {
      const serializedFilters = JSON.stringify(
        filters.map(({ attribute, operator, value, value2 }) => ({
          attribute,
          operator,
          value,
          ...(value2 ? { value2 } : {}),
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

  const parseFiltersParameter = (value: string | null) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((filter: Partial<FilterCondition>, index: number) => ({
        id: filter.id || `filter-url-${Date.now()}-${index}`,
        attribute: String(filter.attribute || ""),
        operator: String(filter.operator || "equals"),
        value: String(filter.value || ""),
        value2: filter.value2 ? String(filter.value2) : undefined,
      }));
    } catch (error) {
      console.warn("Unable to parse filters from URL parameter.", error);
      return [];
    }
  };

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wfsParam = params.get("wfs");
      const filtersParam = params.get("filters");

      if (wfsParam) {
        console.log("Loading WFS from URL parameter:", wfsParam);
        setWfsUrl(wfsParam);
        setInitialFilters(parseFiltersParameter(filtersParam));
        setTimeout(() => {
          analyzeWfsUrl(wfsParam);
        }, 0);
      }
    }
  }, []);

  let firstLoad = false;
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (firstLoad) return;
      const params = new URLSearchParams(window.location.search);
      const wfsLayer = params.get("layer");

      const layerFound = availableLayers.filter((l) => {
        if (l.id === wfsLayer) {
          return l;
        }
      });

      if (layerFound && layerFound[0]?.id) {
        setTimeout(() => {
          setSelectedLayer(layerFound[0]);
          fetchLayerData(layerFound[0]);
        }, 0);
      }

      firstLoad = true;
    }
  }, [availableLayers]);

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
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("wfs", url);
      window.history.pushState(
        { path: newUrl.toString() },
        "",
        newUrl.toString()
      );
    }

    if (url === "") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("wfs");
      newUrl.searchParams.delete("layer");
      newUrl.searchParams.delete("filters");

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
  const analyzeWfsUrl = async (url: string) => {
    if (!url.trim()) {
      setError(t("enterWfsUrl"));
      setErrorType("unknown");
      return;
    }

    // Reset all states
    setError(null);
    setErrorType(null);
    setAnalyzedUrl(url.trim());
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
    setActiveFilters([]);
    setInitialFilters([]);
    updateFiltersParameter([]);

    // Update URL parameter
    updateUrlParameter(url);

    // Clean up the URL if needed
    let cleanUrl = url.trim();

    // If the URL already has GetCapabilities, extract the base URL
    if (
      cleanUrl.includes("GetCapabilities") ||
      cleanUrl.includes("getcapabilities")
    ) {
      try {
        const urlObj = new URL(cleanUrl);
        // Remove specific WFS parameters to get the base URL
        const params = new URLSearchParams(urlObj.search);
        params.delete("request");
        params.delete("service");
        params.delete("version");

        // Reconstruct the URL without WFS-specific parameters
        const remainingParams = params.toString();
        cleanUrl = `${urlObj.origin}${urlObj.pathname}${
          remainingParams ? `?${remainingParams}` : ""
        }`;
      } catch (e) {
        console.error("Error cleaning URL:", e);
        // Continue with the original URL if there's an error
      }
    }

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
        await fetchLayerData(layers[0], cleanUrl);
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
      setIsLoadingLayers(false);
    }
  };

  const handleAnalyze = () => {
    analyzeWfsUrl(wfsUrl);
  };

  // Update the fetchLayerData function to properly pass the URL to fetchLayerDataWithMaxFeatures
  const fetchLayerData = async (layer: LayerInfo, urlOverride?: string) => {
    const urlToUse = urlOverride || wfsUrl;
    await fetchLayerDataWithMaxFeatures(layer, maxFeatures, urlToUse);
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
          wfsUrl
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
    urlOverride?: string
  ) => {
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
      // First try to get the total feature count
      setIsLoadingCount(true);
      try {
        const count = await fetchFeatureCount(urlToUse, layer.id);
        setTotalFeatureCount(count);
      } catch (countError) {
        console.error("Error fetching feature count:", countError);
        setTotalFeatureCount(null);
      } finally {
        setIsLoadingCount(false);
      }

      // Then fetch the actual data with the provided maxFeatures limit
      // Use the layer's default projection first, then convert to WGS84 if needed
      console.log(`Fetching data with max features: ${maxFeaturesValue}`);
      const {
        data,
        attributes: fetchedAttributes,
        sourceProjection,
      } = await fetchWfsData(urlToUse, layer.id, maxFeaturesValue, layer);

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
    updateFiltersParameter(normalizedFilters);
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
  useEffect(() => {
    if (selectedLayer === null) {
      // Reset all data states when URL changes
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
        block: "start",
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
          <div className="mb-8 relative">
            <div>
              <div className="w-full md:w-1/2">
                <h1 className="text-3xl font-bold text-odis-dark mb-2">
                  WFS<span className="text-odis-light">Explorer</span>
                  <p className="text-sm pb-2 italic">aka WFS-Wizard</p>
                </h1>

                <img
                  className="w-8 sm:w-12 md:w-20"
                  style={{
                    position: "absolute",
                    right: "0px",
                    top: "-5px",
                    // width: "85px",
                    // transform: "rotateY(180deg)",
                  }}
                  src="./magicglobe3.svg"
                  alt=""
                />

                {/* </h2> */}
                <p className="mb-4">
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
                    zIndex: 30,
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
            <div className="relative">
              <div className="flex border rounded-lg overflow-hidden">
                <div className="relative flex-grow">
                  <Input
                    id="wfs-url"
                    placeholder={t("wfsUrlPlaceholder")}
                    value={wfsUrl}
                    onChange={(e) => {
                      setWfsUrl(e.target.value);
                      updateUrlParameter("");

                      // If URL changes significantly, clear all previous data
                      if (e.target.value.trim() !== analyzedUrl) {
                        // Clear all data states when URL changes
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAnalyze();
                      }
                    }}
                    className="py-6 px-4 pr-10 text-lg border-0 focus-visible:ring-1 focus-visible:ring-[#1a3a8f] focus-visible:ring-offset-0 rounded-l-md !rounded-r-none"
                  />
                  {wfsUrl && (
                    <button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => {
                        setWfsUrl("");
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

              {wfsData && wfsUrl && !error && (
                <div className="absolute right-0 top-full mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 hover:bg-active-light"
                    onClick={copyUrlToClipboard}
                    title={t("shareWfs")}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {/* {isCopied ? t("copied") : t("shareWfs")} */}
                  </Button>
                </div>
              )}
            </div>

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

          {/* Only show layer information if there's no error */}
          {selectedLayer && !error ? (
            <div className="space-y-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="tracking-tight flex items-center text-lg font-medium">
                    <AlertCircle className="h-5 w-5 mr-2 text-odis-light" />
                    {t("metadataInfo")}
                    {availableLayers.length > 1 && (
                      <button
                        className="p-0 h-auto ml-2 text-odis-light text-sm line-base"
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
                        {t("changeLayer")}
                      </button>
                    )}
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
                      </div>
                    </>

                    {/* WFS Summary Information */}
                    {filteredData && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        <div className="bg-white p-3 border ">
                          <p className="text-sm mb-1">{t("featuresLoaded")}</p>
                          {isMaxFeaturesUpdating ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-odis-light" />
                              <span>{t("loading")}</span>
                            </div>
                          ) : (
                            <p className="text-lg font-bold">
                              {filteredData.features.length.toLocaleString()}
                              {isFiltered && filteredData.totalFeatures && (
                                <span className="text-xs font-normal text-gray-500 ml-1">
                                  {t("filteredFrom")}{" "}
                                  {filteredData.totalFeatures.toLocaleString()}{" "}
                                  {t("total")}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="bg-white p-3 border ">
                          <p className="text-sm mb-1">{t("attributes")}</p>
                          <p className="text-lg font-bold">
                            {attributes.length}
                          </p>
                        </div>
                        <div className="bg-white p-3 border ">
                          <p className="text-sm  mb-1">{t("geometryType")}</p>
                          <p className="text-lg font-bold">
                            {hasGeometry
                              ? filteredData.features[0]?.geometry?.type ||
                                t("unknown")
                              : t("noGeometry")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <FeatureCountSelector
                maxFeatures={maxFeatures}
                onMaxFeaturesChange={handleMaxFeaturesChange}
                totalFeatureCount={totalFeatureCount}
                isLoadingCount={isLoadingCount || isMaxFeaturesUpdating}
              />
            </div>
          ) : null}

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
