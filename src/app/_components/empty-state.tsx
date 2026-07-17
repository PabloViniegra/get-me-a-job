"use client";
"use no memo";

import { Button } from "@heroui/react";

type EmptyStateProps = {
  onRetry?: () => void;
};

export function EmptyState({ onRetry }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <h3 className="text-base font-semibold text-foreground">
        Aún no hay ofertas
      </h3>
      <p className="max-w-sm text-sm text-muted">
        El siguiente scrape automático corre a las 03:00 UTC. Pulsa reintentar
        para volver a comprobar si hay datos.
      </p>
      {onRetry ? (
        <Button onPress={onRetry} variant="secondary">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
