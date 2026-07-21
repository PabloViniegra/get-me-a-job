import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const PRIVATE_NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache",
};

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    responseMeta() {
      return { headers: new Headers(PRIVATE_NO_CACHE_HEADERS) };
    },
    onError({ error, path }) {
      console.error(`[trpc] ${path ?? "<unknown>"}: ${error.message}`);
    },
  });

export { handler as GET, handler as POST };
