"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { LayerInfo } from "@/lib/wfs-service";
import { useLanguage } from "@/lib/language-context";

interface LayerSelectorProps {
  layers: LayerInfo[];
  onSelectLayer: (layer: LayerInfo) => void;
  isLoading: boolean;
}

export function LayerSelector({
  layers,
  onSelectLayer,
  isLoading
}: LayerSelectorProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("availableLayersTitle")}</CardTitle>
        <CardDescription>
          {t("availableLayersDescription").replace(
            "layers",
            `${layers.length} ${t("layers")}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 max-h-[60vh] overflow-y-auto relative z-10">
          {layers.map((layer) => (
            <Button
              key={layer.id}
              variant="outline"
              className="justify-start h-auto py-3 px-4 text-left hover:bg-active-light"
              onClick={() => onSelectLayer(layer)}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium capitalize">
                  {layer.title || layer.id}
                </span>
                {layer.abstract && layer.title !== layer.abstract && (
                  <span className="text-sm text-muted-foreground mt-1">
                    {layer.abstract}
                  </span>
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
