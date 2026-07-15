import { describe, expect, it } from "vitest";
import { createCallerFactory, createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const createCaller = createCallerFactory(appRouter);

describe("appRouter.ping", () => {
  it("returns the expected shape", async () => {
    const caller = createCaller(createTRPCContext());

    const result = await caller.ping();

    expect(result).toEqual({ status: "ok" });
  });
});
