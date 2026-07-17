export type AiAnalysis = {
  score: number;
  whyItFits: string;
};

export type JobSnapshot = {
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
};

export type JobOfferInput = {
  jobId: string;
  title: string;
  linkedinUrl: string;
  description: string;
  salary: string | null;
  format: string;
  requirements: string[];
  descriptionHash: string;
};
