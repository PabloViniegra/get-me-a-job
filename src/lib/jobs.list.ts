import {
  type JobCardData,
  type JobOfferRow,
  toJobCardData,
} from "@/lib/jobs.dto";
import { prisma } from "@/lib/prisma";

export async function listJobs(): Promise<JobCardData[]> {
  const rows = await prisma.jobOffer.findMany({
    orderBy: [{ aiAnalysis: { score: "desc" } }, { updatedAt: "desc" }],
  });
  return rows.map((row) => toJobCardData(row as JobOfferRow));
}
