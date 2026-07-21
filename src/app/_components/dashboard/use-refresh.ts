"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export type RefreshLabels = {
  loading: string;
  success: string;
  error: string;
};

const DEFAULT_LABELS: RefreshLabels = {
  loading: "Actualizando…",
  success: "Actualizado",
  error: "No se pudo actualizar",
};

export function useDashboardRefresh(
  queryKey: QueryKey,
  labels: RefreshLabels = DEFAULT_LABELS,
): () => Promise<void> {
  const queryClient: QueryClient = useQueryClient();
  return useCallback(async () => {
    const { sileo } = await import("sileo");
    void sileo.promise(queryClient.refetchQueries({ queryKey }), {
      loading: { title: labels.loading },
      success: { title: labels.success },
      error: { title: labels.error },
    });
  }, [queryClient, queryKey, labels]);
}
