import type { QueryClient } from "@tanstack/react-query";
import type { useTRPC } from "@/trpc/client";

type TrpcContext = ReturnType<typeof useTRPC>;

export function refreshJobsList(
  queryClient: Pick<QueryClient, "refetchQueries">,
  trpc: TrpcContext,
): Promise<unknown> {
  return queryClient.refetchQueries(trpc.jobs.list.queryFilter());
}
