import { Button } from "@heroui/react/button";
import { FilterX } from "lucide-react";

type FiltersEmptyStateProps = {
  onClearFilters: () => void;
};

export function FiltersEmptyState({ onClearFilters }: FiltersEmptyStateProps) {
  return (
    <output
      aria-live="polite"
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6"
    >
      <span className="font-mono text-xs uppercase tracking-wider text-muted">
        {"// 0 resultados"}
      </span>
      <div className="flex items-center gap-2">
        <FilterX aria-hidden="true" size={16} className="shrink-0 text-muted" />
        <h3 className="text-base font-semibold text-foreground">
          Sin coincidencias
        </h3>
      </div>
      <p className="max-w-md text-sm text-muted">
        Ninguna oferta coincide con los filtros activos.
      </p>
      <Button onPress={onClearFilters} variant="secondary" size="sm">
        Limpiar filtros
      </Button>
    </output>
  );
}
