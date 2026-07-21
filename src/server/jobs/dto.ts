import { type ScoreTier, scoreTier } from "@/lib/score-tier";
import { firstParagraph } from "@/lib/text/paragraphs";

export type { ScoreTier };

export type JobCardData = {
  id: string;
  jobId: string;
  title: string;
  format: string;
  salary: string | null;
  linkedinUrl: string;
  createdAt: Date;
  description: string;
  descriptionPreview: string;
  whyItFits: string | null;
  whyItFitsPreview: string | null;
  requirements: string[];
  allRequirements: string[];
  requirementsOverflowCount: number;
  hasAiAnalysis: boolean;
  score: number | null;
  scoreTier: ScoreTier;
  coverLetter: string | null;
  coverLetterRegenerations: number;
  coverLetterLastRegeneratedAt: Date | null;
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
  gradedDescriptionHash: string | null;
  gradingLeaseUntil: Date | null;
  aiAnalysis: { score: number; whyItFits: string } | null;
  coverLetter: string | null;
  coverLetterDescriptionHash: string | null;
  coverLetterRegenerations: number;
  coverLetterLastRegeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const DESCRIPTION_PREVIEW_MAX = 200;
const WHY_FITS_PREVIEW_MAX = 240;
const REQUIREMENTS_PREVIEW_LIMIT = 5;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function tierFor(aiAnalysis: JobOfferRow["aiAnalysis"]): ScoreTier {
  return scoreTier(
    aiAnalysis === null ? null : aiAnalysis.score,
    aiAnalysis !== null,
  );
}

export function toJobCardData(row: JobOfferRow): JobCardData {
  const aiAnalysis =
    row.descriptionHash !== null &&
    row.gradedDescriptionHash === row.descriptionHash
      ? row.aiAnalysis
      : null;
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
    format: row.format,
    salary: row.salary,
    linkedinUrl: row.linkedinUrl,
    createdAt: row.createdAt,
    description: row.description,
    descriptionPreview: truncate(row.description, DESCRIPTION_PREVIEW_MAX),
    whyItFits: aiAnalysis?.whyItFits ?? null,
    whyItFitsPreview,
    requirements,
    allRequirements: row.requirements,
    requirementsOverflowCount,
    hasAiAnalysis,
    score,
    scoreTier: tierFor(aiAnalysis),
    coverLetter: row.coverLetter ?? null,
    coverLetterRegenerations: row.coverLetterRegenerations ?? 0,
    coverLetterLastRegeneratedAt: row.coverLetterLastRegeneratedAt ?? null,
  };
}
