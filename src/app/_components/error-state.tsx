"use client";
"use no memo";

import { Button } from "@heroui/react";

type ErrorStateProps = {
  errorMessage: string;
  onRetry?: () => void;
};

export function ErrorState({ errorMessage, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <h3 className="text-base font-semibold text-foreground">
        Algo falló al cargar las ofertas
      </h3>
      <p className="max-w-sm text-sm text-muted">{errorMessage}</p>
      {onRetry ? (
        <Button onPress={onRetry} variant="secondary">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
