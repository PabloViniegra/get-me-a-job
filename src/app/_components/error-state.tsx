"use no memo";

import { Button } from "@heroui/react/button";
import { AlertCircle } from "lucide-react";

type ErrorStateProps = {
  errorMessage: string;
  onRetry?: () => void;
};

export function ErrorState({ errorMessage, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6"
    >
      <span className="font-mono text-xs uppercase tracking-wider text-muted">
        {"// error"}
      </span>
      <div className="flex items-center gap-2">
        <AlertCircle
          aria-hidden="true"
          size={16}
          className="shrink-0 text-danger"
        />
        <h3 className="text-base font-semibold text-foreground">
          No se pudieron cargar las ofertas
        </h3>
      </div>
      <p className="max-w-md text-sm text-muted">{errorMessage}</p>
      {onRetry ? (
        <Button onPress={onRetry} variant="secondary" size="sm">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
