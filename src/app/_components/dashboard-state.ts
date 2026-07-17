export type DashboardView = "loading" | "error" | "empty" | "cards";

export type DashboardQueryState = {
  isPending: boolean;
  isError: boolean;
  dataLength: number;
};

export function resolveDashboardView(
  query: DashboardQueryState,
): DashboardView {
  if (query.isPending) return "loading";
  if (query.isError) return "error";
  if (query.dataLength === 0) return "empty";
  return "cards";
}
