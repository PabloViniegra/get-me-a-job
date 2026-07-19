import { log } from "@/lib/log";

export type FireGradingTriggerDeps = {
  fetchImpl?: typeof fetch;
};

export async function fireGradingTrigger(
  baseUrl: string,
  secret: string,
  deps: FireGradingTriggerDeps = {},
): Promise<void> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = new URL("/api/admin/grade", baseUrl);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) {
      log.warn(`[webhook] grade trigger non-2xx status=${res.status}`);
    }
  } catch (err) {
    log.warn(
      `[webhook] grade trigger failed: ${(err as Error).message ?? String(err)}`,
    );
  }
}
