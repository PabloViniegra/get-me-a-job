import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { JobsDashboard } from "./_components/dashboard/jobs-dashboard";
import { CvInfo } from "./_components/shared/cv-info";

const INITIAL_LIST_INPUT = {
  limit: 24,
  sortKey: "score" as const,
  withAnalysis: true,
};

export default async function Home() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchInfiniteQuery(
      trpc.jobs.list.infiniteQueryOptions(INITIAL_LIST_INPUT, {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }),
    ),
    queryClient.prefetchQuery(trpc.jobs.summary.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col items-center font-sans">
        <JobsDashboard actions={<CvInfo />} />
      </main>
    </HydrationBoundary>
  );
}
