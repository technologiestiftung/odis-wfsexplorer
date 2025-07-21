// Translation keys for the application
export type TranslationKey =
  | "appTitle"
  | "appSubtitle"
  | "wfsUrlLabel"
  | "wfsUrlPlaceholder"
  | "analyzeButton"
  | "discoveringLayers"
  | "wfsDescription"
  | "errorTitle"
  | "enterWfsUrl"
  | "noLayersFound"
  | "corsIssueDetected"
  | "corsDescription"
  | "corsOption1"
  | "corsOption2"
  | "corsOption3"
  | "availableLayers"
  | "layers"
  | "layersDescription"
  | "currentLayer"
  | "layerInfoDescription"
  | "layer"
  | "layerName"
  | "layerDescription"
  | "changeLayer"
  | "displayProjection"
  | "sourceProjection"
  | "availableProjections"
  | "loadFullMetadata"
  | "loadingMetadata"
  | "additionalMetadata"
  | "keywords"
  | "contact"
  | "fees"
  | "accessConstraints"
  | "metadataUrl"
  | "viewFullMetadata"
  | "maxFeatures"
  | "totalFeatures"
  | "counting"
  | "unknown"
  | "countNotSupported"
  | "downloadData"
  | "downloadDescription"
  | "downloading"
  | "downloadGeoJSON"
  | "downloadCSV"
  | "downloadFilteredData"
  | "downloadFilteredDescription"
  | "downloadFilteredGeoJSON"
  | "downloadCompleteDataText"
  | "loadingLayerData"
  | "wfsSummary"
  | "wfsSummaryDescription"
  | "featuresLoaded"
  | "filteredFrom"
  | "ofTotal"
  | "attributes"
  | "geometryType"
  | "usingWGS84"
  | "mapPreview"
  | "mapPreviewDescription"
  | "loadingMap"
  | "attributeFilters"
  | "activeFilters"
  | "clearAll"
  | "filterCondition"
  | "attribute"
  | "operator"
  | "value"
  | "minValue"
  | "maxValue"
  | "selectAttribute"
  | "selectOperator"
  | "selectValue"
  | "addFilter"
  | "clear"
  | "applyFilters"
  | "attributeExplorer"
  | "attributeStatistics"
  | "noDataAvailable"
  | "id"
  | "noResults"
  | "showing"
  | "entries"
  | "filteredFromTotal"
  | "dataType"
  | "count"
  | "uniqueValues"
  | "min"
  | "max"
  | "average"
  | "minLength"
  | "maxLength"
  | "avgLength"
  | "topValues"
  | "showMore"
  | "showLess"
  | "valueDistribution"
  | "true"
  | "false"
  | "missingValues"
  | "exampleDatasets"
  | "exampleDatasetsDescription"
  | "ausprobieren"
  | "berlinCemeteries"
  | "berlinCemeteriesDesc"
  | "berlinBlocks"
  | "berlinBlocksDesc"
  | "berlinHikingTrails"
  | "berlinHikingTrailsDesc"
  | "berlinEnergy"
  | "berlinEnergyDesc"
  | "filter"
  | "features"
  | "of"
  | "language"
  | "english"
  | "german"
  | "total"
  | "loadingMap"
  | "projectionError"
  | "projectionErrorDesc"
  | "projectionWarning"
  | "nativeProjection"
  | "nativeProjectionOnly"
  | "mapNotAvailable"
  | "useNativeProjection"
  | "downloadAllFeatures"
  // Add these new translation keys to the TranslationKey type
  | "loadingPerformanceWarning"
  | "allFeatures"
  | "downloadAllNote"
  // New translation keys
  | "clearSelection"
  | "viewOnMap"
  | "noGeometry"
  | "attributeStatisticsTitle"
  | "selectAttributeFirst"
  | "filterByAttribute"
  | "apply"
  | "coordinates"
  | "lat"
  | "lng"
  | "featureProperties"
  | "bounds"
  | "checkConsole"
  | "statisticsFor"
  | "featuresOf"
  | "empty"
  | "statCard"
  | "topValuesTitle"
  | "valueDistributionTitle"
  | "trueValue"
  | "falseValue"
  | "missingValuesTitle"
  | "availableLayersTitle"
  | "availableLayersDescription"
  | "customValue"
  | "features500"
  | "features1000"
  | "features5000"
  | "features10000"
  | "custom"
  | "wgs84"
  | "map"
  | "loaded"
  | "share"
  | "shareWfs"
  | "copied"
  | "minimumValue"
  | "maximumValue"
  | "averageValue"
  | "minimumLength"
  | "maximumLength"
  | "averageLength"
  | "mostFrequent"
  // New download section translations
  | "downloadOptions"
  | "dataFormats"
  | "completeData"
  | "filteredData"
  | "availableFormats"
  | "includeAllFeatures"
  | "currentFilters"
  | "noFiltersApplied"
  // New UI translations
  | "exploreAndAnalyze"
  | "wfsData"
  | "toolDescription1"
  | "toolDescription2"
  | "wfsDataInfo"
  | "keyFeatures"
  | "mapVisualization"
  | "statistics"
  | "statisticsTitle"
  | "filtering"
  | "wgs84Conversion"
  | "dataDownload"
  | "metadataInfo"
  | "interactiveMetadataInfo"
  | "interactiveMetadataInfoDescription"
  | "interactiveMapVisualization"
  | "interactiveMapDescription"
  | "attributeStatisticsDescription"
  | "advancedFiltering"
  | "advancedFilteringDescription"
  | "projectionConversion"
  | "projectionConversionDescription"
  | "formatConversion"
  | "formatConversionDescription"
  | "dataDownloadDescription"
  | "hideExampleDatasets"
  | "showExampleDatasets"
  | "jsonFormatNotSupported"
  | "jsonFormatNotSupportedDesc"
  | "mapPreviewUnavailable"
  | "dataDownloadUnavailable"
  | "attributeStatisticsUnavailable"
  | "limitedFunctionality"
  | "showLessDetails"
  | "showMoreDetails"
  | "loading"
  | "updatingFeatures"
  | "loadingTimeWarning"
  | "filterOptions"
  | "filterDescription"
  | "dataExplorer"
  | "dataExplorerDescription"
  | "invalidWfsUrl"
  | "wfsServiceNotFound"
  | "authenticationRequired"
  | "networkError"
  | "serverError"
  | "troubleshootingSuggestions"
  | "checkUrlTypos"
  | "verifyValidWfs"
  | "checkServerOnline"
  | "tryAddingWfs"
  | "tryExampleDatasets"
  | "unknownError"
  | "fetchDataError"
  | "maxFeaturesUpdateError"
  | "downloadFullDataset"
  | "projectionFormat"
  | "totalAvailable"
  | "downloadGeoJSON"
  | "filteredFeatureCount"
  | "projectionNote"
  | "applyFiltersFirst"
  | "filters"
  | "downloadFilteredGeoJSON"
  | "matchYourFilters"
  | "projectBy"
  | "conductedBy"
  | "inCollaborationWith"
  | "fundedBy"
  | "privacyPolicy"
  | "feedback"
  | "github"
  | "contact"
  | "imprint"
  | "previous"
  | "next";

// English translations
export const enTranslations: Record<TranslationKey, string> = {
  appTitle: "WFS Explorer",
  appSubtitle: "Web Feature Service Data Analysis Tool",
  wfsUrlLabel: "WFS URL",
  wfsUrlPlaceholder: "Enter WFS URL",
  analyzeButton: "Load",
  discoveringLayers: "Discovering Layers...",
  wfsDescription: "Enter a valid WFS URL to analyze its layers and data",
  errorTitle: "Error",
  enterWfsUrl: "Please enter a WFS URL",
  noLayersFound: "No layers found in the WFS service",
  corsIssueDetected: "CORS Issue Detected",
  corsDescription:
    "This error may be caused by Cross-Origin Resource Sharing (CORS) restrictions. The WFS server may not allow requests from your browser. Try:",
  corsOption1: "Using a WFS service that supports CORS",
  corsOption2: "Using a proxy server to bypass CORS restrictions",
  corsOption3: "Running this application on the same domain as the WFS service",
  availableLayers: "Available Layers",
  layers: "layers",
  layersDescription:
    "This WFS service contains multiple layers. Please select one to analyze.",
  currentLayer: "About the Data",
  layerInfoDescription: "Metadata from the loaded WFS layer",
  layer: "Layer:",
  layerName: "Name",
  layerDescription: "Description",
  changeLayer: "Change Layer",
  displayProjection: "Display Projection",
  sourceProjection: "Native Projection",
  availableProjections: "Available Projections:",
  loadFullMetadata: "Show more Metadata",
  loadingMetadata: "Loading Metadata...",
  additionalMetadata: "Additional Metadata",
  keywords: "Keywords",
  contact: "Contact",
  fees: "Fees",
  accessConstraints: "Access Constraints",
  metadataUrl: "Metadata URL:",
  viewFullMetadata: "View Full Metadata",
  maxFeatures: "Maximum Features to Load",
  totalFeatures: "Total Features Available",
  counting: "Counting...",
  unknown: "Unknown",
  countNotSupported: "Count not supported",
  downloadData: "Download Data",
  downloadDescription: "Download the WFS data as GeoJSON",
  downloading: "Downloading...",
  downloadGeoJSON: "Download GeoJSON",
  downloadFilteredData: "Download Filtered Data",
  downloadFilteredDescription: "Download the filtered WFS data as GeoJSON",
  downloadFilteredGeoJSON: "Download Filtered GeoJSON",
  downloadCompleteDataText: "Download complete dataset",
  loadingLayerData: "Loading layer data...",
  wfsSummary: "WFS Summary",
  wfsSummaryDescription: "Overview of the analyzed WFS data",
  featuresLoaded: "Features Loaded",
  filteredFrom: "filtered from",
  ofTotal: "of",
  attributes: "Attributes",
  geometryType: "Geometry Type",
  usingWGS84: "Using WGS84 (EPSG:4326) projection",
  mapPreview: "Map Preview",
  mapPreviewDescription: "Spatial visualization of the WFS data",
  loadingMap: "Loading map...",
  attributeFilters: "Attribute Filters",
  activeFilters: "Active Filters:",
  clearAll: "Clear All",
  filterCondition: "Filter Condition",
  attribute: "Attribute",
  operator: "Operator",
  value: "Value",
  minValue: "Min Value",
  maxValue: "Max Value",
  selectAttribute: "Select attribute",
  selectOperator: "Select operator",
  selectValue: "Select value",
  addFilter: "Add Filter",
  clear: "Clear",
  applyFilters: "Apply Filters",
  attributeExplorer: "Table",
  attributeStatistics: "Attribute Statistics",
  noDataAvailable: "No data available",
  id: "ID",
  noResults: "No results found",
  showing: "Showing",
  entries: "entries",
  filteredFromTotal: "filtered from",
  dataType: "Data Type",
  count: "Count",
  uniqueValues: "Unique Values",
  min: "Min",
  max: "Max",
  average: "Average",
  minLength: "Min Length",
  maxLength: "Max Length",
  avgLength: "Avg Length",
  topValues: "Top Values",
  showMore: "show more",
  showLess: "show less",
  valueDistribution: "Value Distribution",
  true: "True",
  false: "False",
  missingValues: "Missing Values",
  exampleDatasets: "Example services",
  exampleDatasetsDescription: "Find more WFS services from Berlin using the ",
  ausprobieren: ".",
  berlinCemeteries: "Berlin Cemeteries",
  berlinCemeteriesDesc: "Cemetery locations and information in Berlin",
  berlinBlocks: "Berlin Blocks",
  berlinBlocksDesc: "Urban blocks and statistical areas in Berlin",
  berlinHikingTrails: "Berlin Hiking Trails",
  berlinHikingTrailsDesc: "Hiking and walking trails in Berlin",
  berlinEnergyDesc:
    "Energy consumption data at postcode, block and district level",
  berlinEnergy: "Energy consumption in Berlin",
  filter: "Filter",
  features: "features",
  of: "of",
  language: "Language",
  english: "English",
  german: "German",
  total: "total",
  loadingMap: "Loading map...",

  // Projection related translations
  projectionError: "Projection Error",
  projectionErrorDesc:
    "Map preview is not available. Use the download option with native projection instead.",
  projectionWarning: "Projection Warning",
  nativeProjection: "Native projection",
  nativeProjectionOnly:
    "Native projection only - WGS84 conversion not available",
  mapNotAvailable:
    "Map preview not available due to unsupported projection system",
  useNativeProjection: "Use native projection instead",
  downloadAllFeatures: "Download all features",

  // Add these translations to the enTranslations object
  loadingPerformanceWarning:
    "Loading many features may slow down your browser performance",
  allFeatures: "All Features",
  downloadAllNote:
    "You can download all features using the download options below, regardless of how many are loaded for viewing",

  // New translations
  clearSelection: "Clear Selection",
  viewOnMap: "View on map",
  noGeometry: "No geometry available",
  attributeStatisticsTitle: "Attribute Statistics",
  selectAttributeFirst: "Select attribute first",
  filterByAttribute: "Filter by attribute",
  apply: "Apply",
  coordinates: "Coordinates",
  lat: "Lat",
  lng: "Lng",
  featureProperties: "Feature Properties",
  bounds: "Bounds",
  checkConsole: "Check the console for more details",
  statisticsFor: "Summary for",
  featuresOf: "features of",
  empty: "(empty)",
  statCard: "Statistics Card",
  topValuesTitle: "Top Values",
  valueDistributionTitle: "Value Distribution",
  trueValue: "True",
  falseValue: "False",
  missingValuesTitle: "Missing Values",
  availableLayersTitle: "Available Layers",
  availableLayersDescription:
    "This WFS service contains layers. Please select one to analyze.",
  customValue: "Custom...",
  features500: "500 features",
  features1000: "1,000 features",
  features5000: "5,000 features",
  features10000: "10,000 features",
  custom: "Custom",
  wgs84: "WGS84 (EPSG:4326)",
  map: "Map",
  loaded: "Loaded",
  share: "Share",
  shareWfs: "Share this Dataset",
  copied: "Copied!",
  minimumValue: "Minimum Value",
  maximumValue: "Maximum Value",
  averageValue: "Average Value",
  minimumLength: "Minimum Length",
  maximumLength: "Maximum Length",
  averageLength: "Average Length",
  mostFrequent: "Most Frequent Values",

  // New download section translations
  downloadOptions: "Download Options",
  dataFormats: "Download dataset in GeoJSON format",
  completeData: "Complete Data",
  filteredData: "Filtered Data",
  availableFormats: "Available in multiple formats",
  includeAllFeatures: "Include all features",
  currentFilters: "Export with current filters applied",
  noFiltersApplied: "No filters currently applied",

  // New UI translations
  exploreAndAnalyze: "Explore and Analyze",
  wfsData: "WFS Data",
  wfsDataInfo:
    "A WFS (Web Feature Service) is an online service that makes it possible to retrieve geographical data via the Internet.",
  toolDescription1: "Visualize, analyze and export",
  toolDescription2:
    "directly in the browser. Insert a WFS URL or select a sample data set.",
  keyFeatures: "Key Features",
  metadataInfo: "View Metadata",
  interactiveMetadataInfo: "Explore Metadata",
  interactiveMetadataInfoDescription: "Data description and other information",
  mapVisualization: "Map Preview",
  statistics: "Summary",
  statisticsTitle: "Explore Attributes",
  filtering: "Filtering",
  wgs84Conversion: "WGS84 Conversion",
  dataDownload: "Download",
  interactiveMapVisualization: "Interactive Map Preview",
  interactiveMapDescription:
    "View WFS data spatially with interactive features",
  attributeStatisticsDescription: "Analyze data patterns and distributions",
  advancedFiltering: "Advanced Filtering",
  advancedFilteringDescription:
    "Filter data by attribute values and conditions",
  projectionConversion: "Projection Conversion",
  projectionConversionDescription:
    "Automatic conversion to WGS84 for visualization",
  formatConversion: "Format Conversion",
  formatConversionDescription:
    "GML to GeoJSON conversion for better compatibility",
  dataDownloadDescription:
    "Download datasets as GeoJSON in the WGS84 (EPSG:4326) projection or as CSV (attributes only).",
  hideExampleDatasets: "Hide example datasets",
  showExampleDatasets: "Show example datasets",
  jsonFormatNotSupported: "JSON Format Not Supported",
  jsonFormatNotSupportedDesc:
    "This WFS service does not support JSON as an output format. The following features are not available:",
  mapPreviewUnavailable: "Map preview",
  dataDownloadUnavailable: "Data download",
  attributeStatisticsUnavailable: "Attribute statistics",
  limitedFunctionality:
    "You can still explore the attribute data, but spatial visualization and advanced features are limited.",
  showLessDetails: "Show Less Details",
  showMoreDetails: "Show More Details",
  loading: "Loading...",
  updatingFeatures: "Updating with {count} features...",
  loadingTimeWarning: "This may take a moment depending on the data size",
  filterOptions: "Filter Options",
  filterDescription: "Filter data by attribute values",
  dataExplorer: "Data Explorer",
  dataExplorerDescription: "Explore attribute data from the WFS",
  invalidWfsUrl: "Invalid WFS URL (400 Bad Request)",
  wfsServiceNotFound: "WFS Service Not Found (404)",
  authenticationRequired: "Authentication Required",
  networkError: "Network Error",
  serverError: "Server Error",
  troubleshootingSuggestions: "Troubleshooting suggestions:",
  checkUrlTypos: "Check for typos in the URL",
  verifyValidWfs: "Verify that the URL points to a valid WFS service",
  checkServerOnline: "Make sure the server is online and accessible",
  tryAddingWfs: 'Try adding "/wfs" to the end of the URL if it\'s missing',
  tryExampleDatasets: "Try one of our example datasets instead",
  unknownError: "Failed to fetch WFS capabilities due to an unknown error",
  fetchDataError: "Failed to fetch WFS data",
  maxFeaturesUpdateError: "Failed to update data with new max features setting",
  downloadFullDataset: "Download the complete dataset in GeoJSON format",
  projectionFormat: "Coordinate System",
  totalAvailable: "Total available",
  downloadGeoJSON: "Download GeoJSON",
  downloadCSV: "Download CSV",
  filteredFeatureCount: "{count} feature(s) match your filters",
  projectionNote: "Filtered data is exported in the WGS84 projection",
  applyFiltersFirst: "Apply filters to enable filtered data download",
  filters: "filters",
  matchYourFilters: "match your filters",
  // Footer translations
  projectBy: "A project of",
  conductedBy: "Conducted by",
  inCollaborationWith: "In collaboration with",
  fundedBy: "Funded by",
  privacyPolicy: "Privacy Policy",
  feedback: "Feedback",
  github: "GitHub",
  imprint: "Imprint",
  previous: "Previous",
  next: "Next",
};

// German translations
export const deTranslations: Record<TranslationKey, string> = {
  appTitle: "WFS Explorer",
  appSubtitle: "Web Feature Service Datenanalyse-Tool",
  wfsUrlLabel: "WFS URL",
  wfsUrlPlaceholder: "WFS-URL hier einfügen …",
  analyzeButton: "Laden",
  discoveringLayers: "Entdecke Layer...",
  wfsDescription:
    "Gebe eine gültige WFS-URL ein, um deine Layer und Daten zu analysieren",
  errorTitle: "Fehler",
  enterWfsUrl: "Bitte gebe eine WFS-URL ein",
  noLayersFound: "Keine Layer im WFS-Dienst gefunden",
  corsIssueDetected: "CORS-Problem erkannt",
  corsDescription:
    "Dieser Fehler kann durch Cross-Origin Resource Sharing (CORS)-Einschränkungen verursacht werden. Der WFS-Server erlaubt möglicherweise keine Anfragen von Ihrem Browser. Versuchen Sie:",
  corsOption1: "Einen WFS-Dienst zu verwenden, der CORS unterstützt",
  corsOption2:
    "Einen Proxy-Server zu verwenden, um CORS-Einschränkungen zu umgehen",
  corsOption3:
    "Diese Anwendung auf derselben Domain wie den WFS-Dienst auszuführen",
  availableLayers: "Verfügbare Layer",
  layers: "Layer",
  layersDescription:
    "Dieser WFS-Dienst enthält mehrere Layer. Wählen eine zur Analyse aus.",
  currentLayer: "Metadaten explorieren",
  layerInfoDescription: "Metadaten aus der geladene Layer",
  layer: "Layer:",
  layerName: "Name",
  layerDescription: "Beschreibung",
  changeLayer: "Layer ändern",
  displayProjection: "Anzeige-Projektion",
  sourceProjection: "Native-Projektion",
  availableProjections: "Verfügbare Projektionen:",
  loadFullMetadata: "Mehr Metadaten laden",
  loadingMetadata: "Lade Metadaten...",
  additionalMetadata: "Zusätzliche Metadaten",
  keywords: "Schlüsselwörter",
  contact: "Kontakt",
  fees: "Gebühren",
  accessConstraints: "Zugriffsbeschränkungen",
  metadataUrl: "Metadaten-URL",
  viewFullMetadata: "Vollständige Metadaten anzeigen",
  maxFeatures: "Maximale Anzahl zu ladender Features",
  totalFeatures: "Gesamtzahl verfügbarer Features",
  counting: "Zähle...",
  unknown: "Unbekannt",
  countNotSupported: "Zählung nicht unterstützt",
  downloadData: "Daten herunterladen",
  downloadDescription: "Lade die WFS-Daten als GeoJSON herunter",
  downloading: "Wird heruntergeladen...",
  downloadGeoJSON: "GeoJSON herunterladen",
  downloadCSV: "CSV herunterladen",
  downloadFilteredData: "Gefilterte Daten herunterladen",
  downloadFilteredDescription:
    "Lade die gefilterten WFS-Daten als GeoJSON herunter",
  downloadFilteredGeoJSON: "Gefiltertes GeoJSON herunterladen",
  downloadCompleteDataText: "Vollständigen Datensatz herunterladen",
  loadingLayerData: "Lade Layer-Daten...",
  wfsSummary: "WFS-Zusammenfassung",
  wfsSummaryDescription: "Überblick über die analysierten WFS-Daten",
  featuresLoaded: "Geladene Features",
  filteredFrom: "gefiltert aus",
  ofTotal: "von",
  attributes: "Attribute",
  geometryType: "Geometrietyp",
  usingWGS84: "Verwendung von WGS84 (EPSG:4326) Projektion",
  mapPreview: "Kartenvorschau",
  mapPreviewDescription: "Räumliche Visualisierung der WFS-Daten",
  loadingMap: "Lade Karte...",
  attributeFilters: "Attributfilter",
  activeFilters: "Aktive Filter:",
  clearAll: "Alle löschen",
  filterCondition: "Filterbedingung",
  attribute: "Attribut",
  operator: "Operator",
  value: "Wert",
  minValue: "Mindestwert",
  maxValue: "Maximalwert",
  selectAttribute: "Attribut auswählen",
  selectOperator: "Operator auswählen",
  selectValue: "Wert auswählen",
  addFilter: "Filter hinzufügen",
  clear: "Löschen",
  applyFilters: "Filter anwenden",
  attributeExplorer: "Tabelle",
  attributeStatistics: "Attribut-Statistiken",
  noDataAvailable: "Keine Daten verfügbar",
  id: "ID",
  noResults: "Keine Ergebnisse gefunden",
  showing: "Zeige",
  entries: "Einträgen",
  filteredFromTotal: "gefiltert aus",
  dataType: "Datentyp",
  count: "Anzahl",
  uniqueValues: "Eindeutige Werte",
  min: "Min",
  max: "Max",
  average: "Durchschnitt",
  minLength: "Min. Länge",
  maxLength: "Max. Länge",
  avgLength: "Durchschn. Länge",
  topValues: "Häufigste Werte",
  showMore: "mehr anzeigen",
  showLess: "weniger anzeigen",
  valueDistribution: "Werteverteilung",
  true: "Wahr",
  false: "Falsch",
  missingValues: "Fehlende Werte",
  exampleDatasets: "Beispiel Dienste",
  exampleDatasetsDescription: "Finde weitere Berliner WFS-Dienste mit dem ",
  ausprobieren: "ausprobieren.",
  berlinCemeteries: "Berliner Friedhöfe",
  berlinCemeteriesDesc: "Friedhofsstandorte und -informationen in Berlin",
  berlinBlocks: "Berliner Blöcke",
  berlinBlocksDesc: "Stadtblöcke und statistische Gebiete in Berlin",
  berlinHikingTrails: "Berliner Wanderwege",
  berlinHikingTrailsDesc: "Wander- und Spazierwege in Berlin",
  berlinEnergyDesc: "Energieverbrauchsdaten auf PLZ, Block und Bezirksebene",
  berlinEnergy: "Energieverbrauch in Berlin",
  filter: "Filter",
  features: "Funktionen",
  of: "von",
  language: "Sprache",
  english: "Englisch",
  german: "Deutsch",
  total: "gesamt",
  loadingMap: "Lade Karte...",

  // Projection related translations
  projectionError: "Projektionsfehler",
  projectionErrorDesc:
    "Kartenvorschau ist nicht verfügbar. Verwende stattdessen die Download-Option mit nativer Projektion.",
  projectionWarning: "Projektionswarnung",
  nativeProjection: "Native Projektion",
  nativeProjectionOnly:
    "Nur native Projektion - WGS84-Konvertierung nicht verfügbar",
  mapNotAvailable:
    "Kartenvorschau aufgrund nicht unterstütztem Projektionssystem nicht verfügbar",
  useNativeProjection: "Verwende native Projektion",
  downloadAllFeatures: "Alle Features herunterladen",

  // Add these translations to the deTranslations object
  loadingPerformanceWarning:
    "Das Laden vieler Features kann die Browser-Leistung verlangsamen",
  allFeatures: "Alle Features",
  downloadAllNote:
    "Alle Features können über die Download-Optionen unten herunterladen werden, unabhängig davon, wie viele zum Anzeigen geladen sind",

  // New translations
  clearSelection: "Auswahl aufheben",
  viewOnMap: "Auf Karte anzeigen",
  noGeometry: "Keine Geometrie verfügbar",
  attributeStatisticsTitle: "Attribut-Statistiken",
  selectAttributeFirst: "Wähle zuerst ein Attribut",
  filterByAttribute: "Nach Attribut filtern",
  apply: "Anwenden",
  coordinates: "Koordinaten",
  lat: "Breite",
  lng: "Länge",
  featureProperties: "Feature-Eigenschaften",
  bounds: "Grenzen",
  checkConsole: "Überprüfe die Konsole für weitere Details",
  statisticsFor: "Zusammenfassung für",
  featuresOf: "Features von",
  empty: "(leer)",
  statCard: "Statistik-Karte",
  topValuesTitle: "Häufigste Werte",
  valueDistributionTitle: "Werteverteilung",
  trueValue: "Wahr",
  falseValue: "Falsch",
  missingValuesTitle: "Fehlende Werte",
  availableLayersTitle: "Verfügbare Layer",
  availableLayersDescription:
    "Dieser WFS-Dienst enthält mehrere Layer. Bitte wähle eine aus.",
  customValue: "Benutzerdefiniert...",
  features500: "500 Features",
  features1000: "1.000 Features",
  features5000: "5.000 Features",
  features10000: "10.000 Features",
  custom: "Benutzerdefiniert",
  wgs84: "WGS84 (EPSG:4326)",
  map: "Karte",
  loaded: "Geladen",
  share: "Teilen",
  shareWfs: "Diesen Datensatz teilen",
  copied: "Kopiert!",
  minimumValue: "Minimalwert",
  maximumValue: "Maximalwert",
  averageValue: "Durchschnittswert",
  minimumLength: "Minimale Länge",
  maximumLength: "Maximale Länge",
  averageLength: "Durchschnittliche Länge",
  mostFrequent: "Häufigste Werte",

  // New download section translations
  downloadOptions: "Download-Optionen",
  dataFormats: "Daten im GeoJSON-Format herunterladen",
  completeData: "Vollständige Daten",
  filteredData: "Gefilterte Daten",
  availableFormats: "In mehreren Formaten verfügbar",
  includeAllFeatures: "Alle Features einbeziehen",
  currentFilters: "Mit aktuellen Filtern exportieren",
  noFiltersApplied: "Keine Filter angewendet",

  // New UI translations
  exploreAndAnalyze: "Erkunden und Analysieren",
  wfsData: "WFS-Daten",
  wfsDataInfo:
    "Ein WFS (Web Feature Service) ist ein Online-Dienst, der es ermöglicht, geografische Daten über das Internet abzurufen.",
  toolDescription1: "Visualisiere, analysiere und exportiere ",
  toolDescription2:
    "direkt im Browser. Füge eine WFS-URL ein oder wähle einen Beispieldatensatz.",
  keyFeatures: "Hauptfunktionen",
  metadataInfo: "Metadaten einsehen",
  interactiveMetadataInfo: "Metadaten explorieren",
  interactiveMetadataInfoDescription:
    "Datenbeschreibung und andere Informationen",
  mapVisualization: "Kartenvorschau",
  statistics: "Zusammenfassung",
  statisticsTitle: "Attribute erkunden",
  filtering: "Filtern",
  wgs84Conversion: "WGS84-Konvertierung",
  dataDownload: "Download",
  interactiveMapVisualization: "Kartenvorschau",
  interactiveMapDescription:
    "WFS-Daten räumlich mit interaktiven Funktionen anzeigen",
  attributeStatisticsDescription: "Datenmuster und -verteilungen analysieren",
  advancedFiltering: "Erweiterte Filterung",
  advancedFilteringDescription:
    "Daten nach Attributwerten und Bedingungen filtern",
  projectionConversion: "Projektionskonvertierung",
  projectionConversionDescription:
    "Automatische Konvertierung zu WGS84 für die Visualisierung",
  formatConversion: "Formatkonvertierung",
  formatConversionDescription:
    "GML zu GeoJSON-Konvertierung für bessere Kompatibilität",
  dataDownloadDescription:
    "Datensätze als GeoJSON in der Projektion WGS84 (EPSG:4326) herunterladen oder als CSV (nur Attribute).",
  hideExampleDatasets: "Beispieldatensätze ausblenden",
  showExampleDatasets: "Beispieldatensätze anzeigen",
  jsonFormatNotSupported: "JSON-Format nicht unterstützt",
  jsonFormatNotSupportedDesc:
    "Dieser WFS-Dienst unterstützt JSON nicht als Ausgabeformat. Die folgenden Funktionen sind nicht verfügbar:",
  mapPreviewUnavailable: "Kartenvorschau",
  dataDownloadUnavailable: "Daten-Download",
  attributeStatisticsUnavailable: "Attribut-Statistiken",
  limitedFunctionality:
    "Die Attributdaten können weiterhin erkundet werden, aber räumliche Visualisierung und erweiterte Funktionen sind eingeschränkt.",
  showLessDetails: "Weniger Details anzeigen",
  showMoreDetails: "Mehr Details anzeigen",
  loading: "Wird geladen...",
  updatingFeatures: "Aktualisiere mit {count} Features...",
  loadingTimeWarning: "Dies kann je nach Datengröße einen Moment dauern",
  filterOptions: "Filteroptionen",
  filterDescription: "Daten nach Attributwerten filtern",
  dataExplorer: "Daten-Explorer",
  dataExplorerDescription: "Sachdaten aus dem WFS erkunden",
  invalidWfsUrl: "Ungültige WFS-URL (400 Bad Request)",
  wfsServiceNotFound: "WFS-Dienst nicht gefunden (404)",
  authenticationRequired: "Authentifizierung erforderlich",
  networkError: "Netzwerkfehler",
  serverError: "Serverfehler",
  troubleshootingSuggestions: "Fehlerbehebungsvorschläge:",
  checkUrlTypos: "Überprüfe die URL auf Tippfehler",
  verifyValidWfs:
    "Stelle sicher, dass die URL auf einen gültigen WFS-Dienst verweist",
  checkServerOnline: "Stelle sicher, dass der Server online und zugänglich ist",
  tryAddingWfs:
    'Versuchen Sie, "/wfs" am Ende der URL hinzuzufügen, falls es fehlt',
  tryExampleDatasets:
    "Probiere stattdessen einen unserer Beispieldatensätze aus",
  unknownError:
    "Fehler beim Abrufen der WFS-Funktionen aufgrund eines unbekannten Fehlers",
  fetchDataError: "Fehler beim Abrufen der WFS-Daten",
  maxFeaturesUpdateError:
    "Fehler beim Aktualisieren der Daten mit neuer maximaler Feature-Anzahl",
  downloadFullDataset:
    "Lade den vollständigen Datensatz im GeoJSON-Format herunter",
  projectionFormat: "Koordinatensystem",
  totalAvailable: "Insgesamt verfügbar",
  downloadGeoJSON: "GeoJSON herunterladen",
  filteredFeatureCount: "{count} Features entsprechen Ihrer Filterung",
  projectionNote: "Gefilterte Daten werden in der WGS84 Projektion exportiert",
  applyFiltersFirst:
    "Wende einen Filter an, um den Download gefilterter Daten zu aktivieren",
  filters: "Filter",
  downloadFilteredGeoJSON: "Gefiltertes GeoJSON herunterladen",
  matchYourFilters: "entsprechen Ihrer Filterung",
  // Footer translations
  projectBy: "Ein Projekt der",
  conductedBy: "Durchgeführt von der",
  inCollaborationWith: "in Zusammenarbeit mit",
  fundedBy: "Gefördert von",
  privacyPolicy: "Datenschutz",
  feedback: "Feedback",
  github: "GitHub",
  imprint: "Impressum",
  previous: "Zurück",
  next: "Nächstes",
};
