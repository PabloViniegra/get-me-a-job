"use no memo";

import { Button } from "@heroui/react";
import { FilterX } from "lucide-react";

type FiltersEmptyStateProps = {
  onClearFilters: () => void;
};

export function FiltersEmptyState({ onClearFilters }: FiltersEmptyStateProps) {
  return (
    <output
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border-secondary text-muted">
        <FilterX aria-hidden="true" size={20} />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        Sin coincidencias
      </h3>
      <p className="max-w-sm text-sm text-muted">
        Ninguna oferta coincide con los filtros activos.
      </p>
      <Button onPress={onClearFilters} variant="secondary">
        Limpiar filtros
      </Button>
    </output>
  );
}
