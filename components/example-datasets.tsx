"use client";

import type React from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Database, Map, Route, ExternalLink } from "lucide-react";

interface ExampleDataset {
  nameKey: string;
  url: string;
  descriptionKey: string;
  icon: React.ReactNode;
}

interface ExampleDatasetsProps {
  onSelectDataset: (url: string) => void;
}

export function ExampleDatasets({ onSelectDataset }: ExampleDatasetsProps) {
  const { t } = useLanguage();

  const exampleDatasets: ExampleDataset[] = [
    {
      nameKey: "berlinCemeteries",
      url: "https://fbinter.stadt-berlin.de/fb/wfs/data/senstadt/sach_friedh",
      descriptionKey: "berlinCemeteriesDesc",
      icon: <Database className="h-4 w-4" />,
    },
    {
      nameKey: "berlinBlocks",
      url: "https://gdi.berlin.de/services/wfs/bloecke",
      descriptionKey: "berlinBlocksDesc",
      icon: <Map className="h-4 w-4" />,
    },
    {
      nameKey: "berlinHikingTrails",
      url: "https://gdi.berlin.de/services/wfs/gruene_wege?REQUEST=GetCapabilities&SERVICE=wfs",
      descriptionKey: "berlinHikingTrailsDesc",
      icon: <Route className="h-4 w-4" />,
    },
    {
      nameKey: "berlinEnergy",
      url: "https://gdi.berlin.de/services/wfs/ua_stromverbrauch",
      descriptionKey: "berlinEnergyDesc",
      icon: <Route className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {exampleDatasets.map((dataset) => (
        <Button
          key={dataset.url}
          variant="outline"
          className="flex items-center gap-2 justify-start h-auto py-2 px-3 border hover:bg-active-light text-left"
          onClick={() => onSelectDataset(dataset.url)}
          title={t(dataset.descriptionKey)}
        >
          {" "}
          <div className="flex-1">
            <div className="font-medium text-sm ">{t(dataset.nameKey)}</div>
            <div className="text-xs font-light truncate">
              {t(dataset.descriptionKey)}
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
