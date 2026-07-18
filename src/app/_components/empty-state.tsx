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
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6"
    >
      <span className="font-mono text-xs uppercase tracking-wider text-muted">
        {"// empty"}
      </span>
      <div className="flex items-center gap-2">
        <Briefcase
          aria-hidden="true"
          size={16}
          className="shrink-0 text-muted"
        />
        <h3 className="text-base font-semibold text-foreground">
          Sin ofertas todavía
        </h3>
      </div>
      <p className="max-w-md text-sm text-muted">
        El siguiente scrape automático corre a las 03:00 UTC. Pulsa reintentar
        si quieres comprobar si hay datos antes.
      </p>
      {onRetry ? (
        <Button onPress={onRetry} variant="secondary" size="sm">
          Reintentar
        </Button>
      ) : null}
    </output>
  );
}
