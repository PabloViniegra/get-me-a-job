export type ApifyLinkedInJobItem = {
  id: string;
  link: string;
  title: string;
  descriptionText?: string;
  salaryInfo?: string[];
};

export type JobOfferInput = {
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
};

export function mapApifyItemToJobOffer(
  item: ApifyLinkedInJobItem,
): JobOfferInput {
  const description = item.descriptionText ?? "";

  return {
    jobId: item.id,
    title: item.title,
    linkedinUrl: item.link,
    description,
    salary: item.salaryInfo?.length ? item.salaryInfo.join(", ") : null,
    // ponytail: keyword regex, false positives on negated phrasing (e.g. "not
    // remote") — upgrade to Epic 2's LLM grading step if this ceiling matters.
    format: /remote/i.test(description)
      ? "Remote"
      : /hybrid/i.test(description)
        ? "Hybrid"
        : "On-site",
    requirements: [],
  };
}
