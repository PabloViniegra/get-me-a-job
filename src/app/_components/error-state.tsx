"use no memo";

import { Button } from "@heroui/react";
import { AlertCircle } from "lucide-react";

type ErrorStateProps = {
  errorMessage: string;
  onRetry?: () => void;
};

export function ErrorState({ errorMessage, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-border-secondary text-danger">
        <AlertCircle aria-hidden="true" size={20} />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        No se pudieron cargar las ofertas
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
