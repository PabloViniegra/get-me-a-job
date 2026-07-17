export type DashboardStatCounts = {
  total: number;
  excellent: number;
  pending: number;
};

type DashboardCountsInput = {
  totalCount: number;
  excellentCount: number;
  pendingCount: number;
};

export function deriveDashboardCounts(
  input: DashboardCountsInput,
): DashboardStatCounts {
  return {
    total: input.totalCount,
    excellent: input.excellentCount,
    pending: input.pendingCount,
  };
}
