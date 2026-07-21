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
  loading: "Recargando datos…",
  success: "Datos recargados",
  error: "No se pudieron recargar los datos",
};

export function refetchDashboardQueries(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Promise<void> {
  return queryClient.refetchQueries({ queryKey }, { throwOnError: true });
}

export function useDashboardRefresh(
  queryKey: QueryKey,
  labels: RefreshLabels = DEFAULT_LABELS,
): () => Promise<void> {
  const queryClient: QueryClient = useQueryClient();
  return useCallback(async () => {
    const { sileo } = await import("sileo");
    void sileo.promise(refetchDashboardQueries(queryClient, queryKey), {
      loading: { title: labels.loading },
      success: { title: labels.success },
      error: { title: labels.error },
    });
  }, [queryClient, queryKey, labels]);
}
