"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export default function Home() {
  const trpc = useTRPC();
  const ping = useQuery(trpc.ping.queryOptions());

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        get-me-a-job
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {ping.isPending && "pinging server..."}
        {ping.isError && `ping failed: ${ping.error.message}`}
        {ping.data && `ping: ${ping.data.status}`}
      </p>
    </div>
  );
}
