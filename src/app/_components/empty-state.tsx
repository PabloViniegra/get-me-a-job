"use no memo";

import { Button } from "@heroui/react";
import { Briefcase } from "lucide-react";

type EmptyStateProps = {
  onRetry?: () => void;
};

export function EmptyState({ onRetry }: EmptyStateProps) {
  return (
    <output
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border-secondary text-muted">
        <Briefcase aria-hidden="true" size={20} />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        Sin ofertas todavía
      </h3>
      <p className="max-w-sm text-sm text-muted">
        El siguiente scrape automático corre a las 03:00 UTC. Pulsa reintentar
        si quieres comprobar si hay datos antes.
      </p>
      {onRetry ? (
        <Button onPress={onRetry} variant="secondary">
          Reintentar
        </Button>
      ) : null}
    </output>
  );
}
