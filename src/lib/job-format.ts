import type { JobSnapshot } from "@/lib/job";

export type JobFormatLocale = "es" | "en";

const MISSING_SALARY: Record<JobFormatLocale, string> = {
  en: "Not disclosed",
  es: "No publicado",
};

const NO_REQUIREMENTS: Record<JobFormatLocale, string> = {
  en: "(none)",
  es: "(sin requisitos explícitos)",
};

export function formatJob(
  job: JobSnapshot,
  locale: JobFormatLocale = "en",
): string {
  const salary = job.salary ?? MISSING_SALARY[locale];
  const requirements =
    job.requirements.length > 0
      ? job.requirements.map((r) => `- ${r}`).join("\n")
      : NO_REQUIREMENTS[locale];
  return [
    `Title: ${job.title}`,
    `Format: ${job.format}`,
    `Salary: ${salary}`,
    `LinkedIn: ${job.linkedinUrl}`,
    "",
    "Description:",
    job.description,
    "",
    "Requirements:",
    requirements,
  ].join("\n");
}
