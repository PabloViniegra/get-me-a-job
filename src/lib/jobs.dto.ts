export type ScoreTier = "pending" | "excellent" | "worth" | "low";

export type JobCardData = {
  id: string;
  jobId: string;
  title: string;
  descriptionPreview: string;
  whyItFitsPreview: string | null;
  requirements: string[];
  requirementsOverflowCount: number;
  hasAiAnalysis: boolean;
  score: number | null;
  scoreTier: ScoreTier;
};

export type JobOfferRow = {
  id: string;
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
  descriptionHash: string | null;
  aiAnalysis: { score: number; whyItFits: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

const DESCRIPTION_PREVIEW_MAX = 200;
const WHY_FITS_PREVIEW_MAX = 240;
const REQUIREMENTS_PREVIEW_LIMIT = 5;

const PARAGRAPH_SPLIT = /\n\n|\n/;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function firstParagraph(text: string): string {
  const first = text.split(PARAGRAPH_SPLIT).find((segment) => segment.trim());
  return first ? first.trim() : "";
}

function tierFor(aiAnalysis: JobOfferRow["aiAnalysis"]): ScoreTier {
  if (aiAnalysis === null) return "pending";
  if (aiAnalysis.score >= 85) return "excellent";
  if (aiAnalysis.score >= 65) return "worth";
  return "low";
}

export function toJobCardData(row: JobOfferRow): JobCardData {
  const { aiAnalysis } = row;
  const hasAiAnalysis = aiAnalysis !== null;
  const score = aiAnalysis === null ? null : aiAnalysis.score;

  const whyItFitsPreview =
    aiAnalysis === null
      ? null
      : truncate(firstParagraph(aiAnalysis.whyItFits), WHY_FITS_PREVIEW_MAX);

  const requirements = row.requirements.slice(0, REQUIREMENTS_PREVIEW_LIMIT);
  const requirementsOverflowCount =
    row.requirements.length - requirements.length;

  return {
    id: row.id,
    jobId: row.jobId,
    title: row.title,
    descriptionPreview: truncate(row.description, DESCRIPTION_PREVIEW_MAX),
    whyItFitsPreview,
    requirements,
    requirementsOverflowCount,
    hasAiAnalysis,
    score,
    scoreTier: tierFor(aiAnalysis),
  };
}
