"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { calculateAttributeStats } from "@/lib/stats-utils";
import { useLanguage } from "@/lib/language-context";

// Define filter operators based on data type
const STRING_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "isEmpty", label: "Is Empty" },
  { value: "isNotEmpty", label: "Is Not Empty" },
];

const NUMBER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "greaterThanOrEqual", label: "Greater Than or Equal" },
  { value: "lessThan", label: "Less Than" },
  { value: "lessThanOrEqual", label: "Less Than or Equal" },
  { value: "between", label: "Between" },
  { value: "isNull", label: "Is Null" },
  { value: "isNotNull", label: "Is Not Null" },
];

const BOOLEAN_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
];

const DATE_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "between", label: "Between" },
  { value: "isNull", label: "Is Null" },
  { value: "isNotNull", label: "Is Not Null" },
];

// Define filter condition interface
export interface FilterCondition {
  id: string;
  attribute: string;
  operator: string;
  value: string;
  value2?: string; // For "between" operators
}

interface AttributeFilterProps {
  data: any;
  attributes: string[];
  onFilterChange: (filteredData: any, filters: FilterCondition[]) => void;
  onActiveFiltersChange?: (filters: FilterCondition[]) => void; // Add this line
  initialFilters?: FilterCondition[];
}

export function AttributeFilter({
  data,
  attributes,
  onFilterChange,
  onActiveFiltersChange,
  initialFilters = [],
}: AttributeFilterProps) {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    []
  );
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [filteredRemoved, setFilteredRemoved] = useState<boolean>(false);
  const [pendingUrlApply, setPendingUrlApply] = useState(false);
  const hasAppliedInitialFilters = useRef(false);

  const [attributeValueSuggestions, setAttributeValueSuggestions] = useState<
    Record<string, string[]>
  >({});

  const { t } = useLanguage();

  // Reset filters when data changes completely (new layer loaded)
  useEffect(() => {
    if (!data) {
      setFilterConditions([]);
      setActiveFilters([]);
      setFilteredCount(null);
      return;
    }

    // Only reset if it's a new dataset (check if features length changed significantly)
    if (activeFilters.length > 0) {
      // Re-apply existing filters to the new data
      applyFilters();
    } else {
      // Pass the original data when no filters exist
      onFilterChange(data, []);
    }

    // Generate suggestions for all attributes
    if (data && data.features && data.features.length > 0) {
      const suggestions: Record<string, string[]> = {};

      attributes.forEach((attr) => {
        suggestions[attr] = getSuggestionsForAttribute(attr);
      });

      setAttributeValueSuggestions(suggestions);
    }
  }, [data, attributes]);

  // Get attribute data types
  const attributeTypes = useMemo(() => {
    const types: Record<string, string> = {};

    attributes.forEach((attr) => {
      if (data && data.features && data.features.length > 0) {
        const stats = calculateAttributeStats(data.features, attr);
        types[attr] = stats.dataType;
      }
    });

    return types;
  }, [data, attributes]);

  // Add a new filter condition
  const addFilterCondition = () => {
    const newCondition: FilterCondition = {
      id: `filter-${Date.now()}`,
      attribute: attributes[0] || "",
      operator: "equals",
      value: "",
    };
    setFilterConditions([...filterConditions, newCondition]);
  };

  useEffect(() => {
    console.log("filteredRemoved", filteredRemoved);

    if (filteredRemoved) {
      applyFilters();
      setFilteredRemoved(false);
    }
  }, [filteredRemoved, applyFilters]);

  // Remove a filter condition
  const removeFilterCondition = (id: string) => {
    setFilterConditions(
      filterConditions.filter((condition) => condition.id !== id)
    );

    setFilteredRemoved(true);
  };

  // Update a filter condition
  const updateFilterCondition = (
    id: string,
    field: keyof FilterCondition,
    value: string
  ) => {
    setFilterConditions(
      filterConditions.map((condition) => {
        if (condition.id === id) {
          // If changing the attribute, reset the operator to an appropriate default
          if (field === "attribute") {
            const dataType = attributeTypes[value] || "string";
            const defaultOperator = "equals";

            return {
              ...condition,
              [field]: value,
              operator: defaultOperator,
              value: "",
              value2: undefined,
            };
          }

          // If changing the operator to one that doesn't need a value
          if (
            field === "operator" &&
            ["isEmpty", "isNotEmpty", "isNull", "isNotNull"].includes(value)
          ) {
            return {
              ...condition,
              [field]: value,
              value: "",
              value2: undefined,
            };
          }

          // If changing to "between" operator, initialize value2
          if (field === "operator" && value === "between") {
            return {
              ...condition,
              [field]: value,
              value2: "",
            };
          }

          // Default case
          return { ...condition, [field]: value };
        }
        return condition;
      })
    );
  };

  // Get suggestions for attribute values
  const getSuggestionsForAttribute = (attribute: string): string[] => {
    if (!data || !data.features || data.features.length === 0) return [];

    const dataType = attributeTypes[attribute] || "string";
    const uniqueValues = new Set<string>();
    const maxSuggestions = 20;

    // Collect unique values for the attribute
    data.features.forEach((feature: any) => {
      if (
        feature.properties &&
        feature.properties[attribute] !== undefined &&
        feature.properties[attribute] !== null
      ) {
        uniqueValues.add(String(feature.properties[attribute]));
      }
    });

    // Convert to array and limit to max suggestions
    return Array.from(uniqueValues).slice(0, maxSuggestions);
  };

  // Get operators based on attribute data type
  const getOperatorsForAttribute = (attribute: string) => {
    const dataType = attributeTypes[attribute] || "string";

    switch (dataType) {
      case "number":
        return NUMBER_OPERATORS;
      case "boolean":
        return BOOLEAN_OPERATORS;
      case "date":
        return DATE_OPERATORS;
      default:
        return STRING_OPERATORS;
    }
  };

  const applyFilters = useCallback(() => {
    if (!data || !data.features || filterConditions.length === 0) {
      onFilterChange(data, []);
      setActiveFilters([]);
      setFilteredCount(null);
      if (onActiveFiltersChange) onActiveFiltersChange([]);
      return;
    }

    const filteredFeatures = data.features.filter((feature: any) => {
      return filterConditions.every((condition) => {
        const { attribute, operator, value, value2 } = condition;
        const featureValue = feature.properties[attribute];

        // Handle null/undefined values
        if (featureValue === null || featureValue === undefined) {
          if (operator === "isNull" || operator === "isEmpty") return true;
          if (operator === "isNotNull" || operator === "isNotEmpty")
            return false;
          return false;
        }

        const dataType = attributeTypes[attribute] || "string";

        // Convert values based on data type for comparison
        let typedFeatureValue = featureValue;
        let typedValue = value;
        let typedValue2 = value2;

        if (dataType === "number") {
          typedFeatureValue = Number(featureValue);
          typedValue = Number(value);
          if (value2) typedValue2 = Number(value2);
        } else if (dataType === "boolean") {
          typedFeatureValue = String(featureValue).toLowerCase() === "true";
          typedValue = value === "true";
        } else if (dataType === "date") {
          typedFeatureValue = new Date(featureValue);
          typedValue = new Date(value);
          if (value2) typedValue2 = new Date(value2);
        } else {
          // String type - convert everything to lowercase string for case-insensitive comparison
          typedFeatureValue = String(featureValue).toLowerCase();
          typedValue = String(value).toLowerCase();
          if (value2) typedValue2 = String(value2).toLowerCase();
        }

        // Apply the operator
        switch (operator) {
          case "equals":
            if (dataType === "string") {
              return typedFeatureValue === typedValue;
            }
            return typedFeatureValue == typedValue; // Use loose equality for other types

          case "notEquals":
            if (dataType === "string") {
              return typedFeatureValue !== typedValue;
            }
            return typedFeatureValue != typedValue;

          case "contains":
            return typedFeatureValue.includes(typedValue);

          case "startsWith":
            return typedFeatureValue.startsWith(typedValue);

          case "endsWith":
            return typedFeatureValue.endsWith(typedValue);

          case "isEmpty":
            return (
              typedFeatureValue === "" ||
              typedFeatureValue === null ||
              typedFeatureValue === undefined
            );

          case "isNotEmpty":
            return (
              typedFeatureValue !== "" &&
              typedFeatureValue !== null &&
              typedFeatureValue !== undefined
            );

          case "greaterThan":
            return typedFeatureValue > typedValue;

          case "greaterThanOrEqual":
            return typedFeatureValue >= typedValue;

          case "lessThan":
            return typedFeatureValue < typedValue;

          case "lessThanOrEqual":
            return typedFeatureValue <= typedValue;

          case "between":
            return (
              typedFeatureValue >= typedValue &&
              typedFeatureValue <= typedValue2
            );

          case "isNull":
            return featureValue === null || featureValue === undefined;

          case "isNotNull":
            return featureValue !== null && featureValue !== undefined;

          case "before":
            return typedFeatureValue < typedValue;

          case "after":
            return typedFeatureValue > typedValue;

          default:
            return true;
        }
      });
    });

    // Create filtered data object
    const filteredData = {
      ...data,
      features: filteredFeatures,
    };

    // Update filtered count and active filters
    setFilteredCount(filteredFeatures.length);
    setActiveFilters([...filterConditions]);

    // Notify parent about active filters
    if (onActiveFiltersChange) {
      onActiveFiltersChange([...filterConditions]);
    }

    // Pass filtered data to parent component
    onFilterChange(filteredData, [...filterConditions]);
  }, [
    data,
    filterConditions,
    attributeTypes,
    onFilterChange,
    onActiveFiltersChange,
  ]);

  useEffect(() => {
    if (!initialFilters.length || !data || !attributes.length) return;
    if (hasAppliedInitialFilters.current) return;

    const normalizedFilters = initialFilters
      .filter((condition) => attributes.includes(condition.attribute))
      .map((condition, index) => ({
        ...condition,
        id: condition.id || `filter-${Date.now()}-${index}`,
      }));

    if (normalizedFilters.length === 0) {
      hasAppliedInitialFilters.current = true;
      return;
    }

    setFilterConditions(normalizedFilters);
    setPendingUrlApply(true);
    hasAppliedInitialFilters.current = true;
  }, [initialFilters, data, attributes]);

  useEffect(() => {
    if (!pendingUrlApply) return;
    applyFilters();
    setPendingUrlApply(false);
  }, [pendingUrlApply, applyFilters]);

  // Clear all filters
  const clearFilters = () => {
    setFilterConditions([]);
    setActiveFilters([]);
    setFilteredCount(null);
    onFilterChange(data, []);
  };

  // Get operator label from value
  const getOperatorLabel = (attribute: string, operatorValue: string) => {
    const operators = getOperatorsForAttribute(attribute);
    const operator = operators.find((op) => op.value === operatorValue);
    return operator ? operator.label : operatorValue;
  };

  // Format filter condition for display
  const formatFilterCondition = (condition: FilterCondition) => {
    const { attribute, operator, value, value2 } = condition;
    const operatorLabel = getOperatorLabel(attribute, operator);

    if (["isEmpty", "isNotEmpty", "isNull", "isNotNull"].includes(operator)) {
      return `${attribute} ${operatorLabel}`;
    }

    if (operator === "between" && value2) {
      return `${attribute} ${operatorLabel} ${value} and ${value2}`;
    }

    return `${attribute} ${operatorLabel} ${value}`;
  };

  return (
    <div className="space-y-4">
      {/* Show filter count badge */}
      {activeFilters.length > 0 && (
        <div className="flex justify-end">
          <Badge variant="secondary">
            {filteredCount} {t("of")} {data.features.length} {t("features")}
          </Badge>
        </div>
      )}

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="bg-muted p-3 rounded-md">
          <div className="text-sm font-medium mb-2">{t("activeFilters")}</div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant="outline"
                className="flex items-center gap-1"
              >
                {formatFilterCondition(filter)}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={clearFilters}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t("clearAll")}
            </Button>
          </div>
        </div>
      )}

      {/* Filter conditions */}
      {filterConditions.map((condition, index) => (
        <div key={condition.id} className="grid gap-3 p-3 border rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("filter")} {index + 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => removeFilterCondition(condition.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Attribute selector */}
            <div className="space-y-1">
              <Label htmlFor={`attribute-${condition.id}`} className="text-xs">
                {t("attribute")}
              </Label>
              <Select
                value={condition.attribute}
                onValueChange={(value) =>
                  updateFilterCondition(condition.id, "attribute", value)
                }
              >
                <SelectTrigger id={`attribute-${condition.id}`}>
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  {attributes.map((attr) => (
                    <SelectItem key={attr} value={attr}>
                      {attr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator selector */}
            <div className="space-y-1">
              <Label htmlFor={`operator-${condition.id}`} className="text-xs">
                {t("operator")}
              </Label>
              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  updateFilterCondition(condition.id, "operator", value)
                }
              >
                <SelectTrigger id={`operator-${condition.id}`}>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {getOperatorsForAttribute(condition.attribute).map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value input(s) */}
            <div className="space-y-1">
              {!["isEmpty", "isNotEmpty", "isNull", "isNotNull"].includes(
                condition.operator
              ) && (
                <>
                  <Label htmlFor={`value-${condition.id}`} className="text-xs">
                    {condition.operator === "between"
                      ? t("minValue")
                      : t("value")}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`value-${condition.id}`}
                      value={condition.value}
                      onChange={(e) =>
                        updateFilterCondition(
                          condition.id,
                          "value",
                          e.target.value
                        )
                      }
                      type={
                        attributeTypes[condition.attribute] === "number"
                          ? "number"
                          : attributeTypes[condition.attribute] === "date"
                          ? "date"
                          : "text"
                      }
                      list={`suggestions-${condition.id}`}
                    />
                    <datalist id={`suggestions-${condition.id}`}>
                      {attributeValueSuggestions[condition.attribute]?.map(
                        (suggestion, idx) => (
                          <option key={idx} value={suggestion} />
                        )
                      )}
                    </datalist>
                  </div>

                  {/* Second value for "between" operator */}
                  {condition.operator === "between" && (
                    <div className="mt-2">
                      <Label
                        htmlFor={`value2-${condition.id}`}
                        className="text-xs"
                      >
                        Max Value
                      </Label>
                      <div className="relative">
                        <Input
                          id={`value2-${condition.id}`}
                          value={condition.value2 || ""}
                          onChange={(e) =>
                            updateFilterCondition(
                              condition.id,
                              "value2",
                              e.target.value
                            )
                          }
                          type={
                            attributeTypes[condition.attribute] === "number"
                              ? "number"
                              : attributeTypes[condition.attribute] === "date"
                              ? "date"
                              : "text"
                          }
                          list={`suggestions2-${condition.id}`}
                        />
                        <datalist id={`suggestions2-${condition.id}`}>
                          {attributeValueSuggestions[condition.attribute]?.map(
                            (suggestion, idx) => (
                              <option key={idx} value={suggestion} />
                            )
                          )}
                        </datalist>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* For boolean type, show true/false selector */}
              {attributeTypes[condition.attribute] === "boolean" &&
                !["isEmpty", "isNotEmpty", "isNull", "isNotNull"].includes(
                  condition.operator
                ) && (
                  <div className="mt-1">
                    <Select
                      value={condition.value}
                      onValueChange={(value) =>
                        updateFilterCondition(condition.id, "value", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
            </div>
          </div>
        </div>
      ))}

      {/* Add filter button */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={addFilterCondition}
          disabled={attributes.length === 0}
          className="bg-odis-light hover:bg-active hover:!text-odis-dark text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("addFilter")}
        </Button>

        {filterConditions.length > 0 && (
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              {t("clear")}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-odis-light hover:bg-active hover:!text-odis-dark text-white"
              onClick={applyFilters}
            >
              {t("applyFilters")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
