import { unstable_cache } from "next/cache";
import { listJobs, summarizeJobs } from "@/lib/jobs.list";
import { jobsListInputSchema } from "@/lib/jobs.list.schema";
import { JobsDashboard } from "./_components/jobs-dashboard";

const fetchInitialJobsPage = unstable_cache(
  async () => listJobs(jobsListInputSchema.parse({ limit: 24 })),
  ["dashboard-initial-page"],
  { revalidate: 300, tags: ["dashboard-jobs"] },
);

const fetchInitialJobsSummary = unstable_cache(
  async () => summarizeJobs(),
  ["dashboard-initial-summary"],
  { revalidate: 300, tags: ["dashboard-summary"] },
);

export const dynamic = "force-dynamic";

export default async function Home() {
  const [firstPage, summary] = await Promise.all([
    fetchInitialJobsPage(),
    fetchInitialJobsSummary(),
  ]);
  return (
    <div className="flex flex-1 flex-col items-center font-sans">
      <JobsDashboard firstPage={firstPage} summary={summary} />
    </div>
  );
}
