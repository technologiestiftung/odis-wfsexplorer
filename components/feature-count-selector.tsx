"use client";

import { useLanguage } from "@/lib/language-context";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

interface FeatureCountSelectorProps {
  maxFeatures: number;
  onMaxFeaturesChange: (maxFeatures: number) => void;
  totalFeatureCount: number | null;
  isLoadingCount: boolean;
}

export function FeatureCountSelector(props: FeatureCountSelectorProps) {
  const {
    maxFeatures,
    onMaxFeaturesChange,
    totalFeatureCount,
    isLoadingCount,
  } = props;
  const { t } = useLanguage();
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState(maxFeatures.toString());
  const [shouldShowSelector, setShouldShowSelector] = useState(true);

  useEffect(() => {
    if (
      totalFeatureCount !== null &&
      totalFeatureCount < 500 &&
      !isLoadingCount
    ) {
      setShouldShowSelector(false);
    } else {
      setShouldShowSelector(true);
    }
  }, [totalFeatureCount, isLoadingCount]);

  // Update custom value when maxFeatures changes
  useEffect(() => {
    const predefinedOptions = [500, 1000, 5000, 10000];
    setIsCustom(
      !predefinedOptions.includes(maxFeatures) &&
        maxFeatures !== totalFeatureCount
    );
    setCustomValue(maxFeatures.toString());
  }, [maxFeatures, totalFeatureCount]);

  // Handle select change
  const handleSelectChange = (value: string) => {
    if (value === "custom") {
      setIsCustom(true);
    } else if (value === "all") {
      setIsCustom(false);
      onMaxFeaturesChange(totalFeatureCount || 100000);
    } else {
      setIsCustom(false);
      onMaxFeaturesChange(Number.parseInt(value, 10));
    }
  };

  // Handle custom value apply
  const handleCustomApply = () => {
    const value = Number.parseInt(customValue, 10);
    if (!isNaN(value) && value > 0) {
      // Ensure we don't exceed the total feature count if known
      if (totalFeatureCount !== null && value > totalFeatureCount) {
        onMaxFeaturesChange(totalFeatureCount);
      } else {
        onMaxFeaturesChange(value);
      }
    }
  };

  if (!shouldShowSelector) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 bg-slate-50 border rounded-lg p-3 text-sm text-slate-700">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="max-features" className="font-semibold text-slate-700">
          {t("maxFeatures")}:
        </Label>

        <div className="flex items-center gap-2">
          <Select
            value={
              isCustom
                ? "custom"
                : maxFeatures === totalFeatureCount &&
                  totalFeatureCount !== null
                ? "all"
                : maxFeatures.toString()
            }
            onValueChange={handleSelectChange}
          >
            <SelectTrigger id="max-features" className="w-[150px] h-9">
              <SelectValue placeholder="Select limit" />
            </SelectTrigger>
            <SelectContent>
              {[500, 1000, 5000, 10000].map((count) =>
                totalFeatureCount === null || count <= totalFeatureCount ? (
                  <SelectItem key={count} value={count.toString()}>
                    {t(`features${count}`)}
                  </SelectItem>
                ) : null
              )}
              {totalFeatureCount !== null &&
                totalFeatureCount > 0 &&
                maxFeatures < totalFeatureCount && (
                  <SelectItem value="all">
                    {t("allFeatures")} ({totalFeatureCount.toLocaleString()})
                  </SelectItem>
                )}
              <SelectItem value="custom">{t("customValue")}</SelectItem>
            </SelectContent>
          </Select>

          {totalFeatureCount !== null && totalFeatureCount !== -1 && (
            <span className="text-slate-500 font-normal">
              ({t("ofTotal")} {totalFeatureCount.toLocaleString()})
            </span>
          )}

          {isCustom && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customValue}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value, 10);
                  // Don't allow values greater than total feature count if known
                  if (
                    totalFeatureCount !== null &&
                    !isNaN(value) &&
                    value > totalFeatureCount
                  ) {
                    setCustomValue(totalFeatureCount.toString());
                  } else {
                    setCustomValue(e.target.value);
                  }
                }}
                className="w-20 h-9 px-2 py-1 border rounded-md text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                min="1"
                max={totalFeatureCount !== null ? totalFeatureCount : undefined}
              />
              <Button size="sm" onClick={handleCustomApply} className="h-9 px-3">
                {t("apply")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium mt-1">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{t("loadingPerformanceWarning")}</span>
      </div>
    </div>
  );
}