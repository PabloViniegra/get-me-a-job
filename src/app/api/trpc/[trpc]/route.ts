import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

const PRIVATE_NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache",
};

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    responseMeta({ type, errors }) {
      const isSuccessfulGet =
        req.method === "GET" && type === "query" && errors.length === 0;
      const headers = isSuccessfulGet
        ? PUBLIC_CACHE_HEADERS
        : PRIVATE_NO_CACHE_HEADERS;
      return { headers: new Headers(headers) };
    },
    onError({ error, path }) {
      console.error(`[trpc] ${path ?? "<unknown>"}: ${error.message}`);
    },
  });

export { handler as GET, handler as POST };
