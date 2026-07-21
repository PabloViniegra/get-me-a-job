import { createHash } from "node:crypto";
import type { JobOfferInput } from "@/lib/job";
import { isHttpUrl } from "@/lib/url";

// Output shape for `cheap_scraper/linkedin-job-scraper`.
// https://apify.com/cheap_scraper/linkedin-job-scraper
export type ApifyLinkedInJobItem = {
  jobId: string;
  jobTitle: string;
  jobUrl: string;
  jobDescription?: string;
  salaryInfo?: string[];
  location?: string;
};

export function mapApifyItemToJobOffer(
  item: ApifyLinkedInJobItem,
): JobOfferInput {
  if (!isHttpUrl(item.jobUrl)) {
    throw new Error(`linkedinUrl is not http(s) (jobId=${item.jobId})`);
  }
  const description = item.jobDescription ?? "";

  return {
    jobId: item.jobId,
    title: item.jobTitle,
    linkedinUrl: item.jobUrl,
    description,
    salary: item.salaryInfo?.length ? item.salaryInfo.join(", ") : null,
    // ponytail: keyword regex on description + location — actor doesn't expose
    // work location directly (its output `workType` is job function, not Remote/Hybrid).
    // Revisit when Epic 2 grading upgrades format detection.
    format: detectFormat(description, item.location),
    requirements: [],
    descriptionHash: createHash("sha256").update(description).digest("hex"),
  };
}

function detectFormat(description: string, location?: string): string {
  const haystack = `${description}\n${location ?? ""}`;
  if (/remote|remoto/i.test(haystack)) return "Remote";
  if (/hybrid|híbrido/i.test(haystack)) return "Hybrid";
  return "On-site";
}
