"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function JobsDashboard() {
  const trpc = useTRPC();
  const jobs = useQuery(trpc.jobs.list.queryOptions());

  if (jobs.isPending) {
    return (
      <ul className="flex w-full max-w-2xl flex-col gap-2 p-4">
        <li className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </ul>
    );
  }

  if (jobs.isError) {
    return (
      <p className="p-4 text-sm text-red-600 dark:text-red-400">
        Failed to load jobs: {jobs.error.message}
      </p>
    );
  }

  if (jobs.data.length === 0) {
    return (
      <p className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
        No jobs ingested yet.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-2xl flex-col gap-2 p-4">
      {jobs.data.map((job) => (
        <li
          key={job.id}
          className="rounded border border-zinc-200 px-3 py-2 text-black dark:border-zinc-800 dark:text-zinc-50"
        >
          {job.title}
        </li>
      ))}
    </ul>
  );
}
