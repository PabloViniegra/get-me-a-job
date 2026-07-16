import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type ApifyLinkedInJobItem,
  mapApifyItemToJobOffer,
} from "./apify-mapper";
import { prisma } from "./prisma";

const TEST_JOB_ID = "integration-test-job-offer";
const TEST_DESCRIPTION = "Integration test job offer.";

// Live integration test — requires a valid DATABASE_URL.
// Run with: bun run test -- src/lib/prisma.integration.test.ts (and a real MongoDB)
const isIntegrationEnabled =
  process.env.RUN_INTEGRATION === "1" &&
  process.env.DATABASE_URL?.startsWith("mongodb") &&
  !process.env.DATABASE_URL.includes("localhost:27017/test");

const suite = isIntegrationEnabled ? describe : describe.skip;

suite("prisma client (integration)", () => {
  beforeAll(async () => {
    await prisma.jobOffer.deleteMany({ where: { jobId: TEST_JOB_ID } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("upserts a JobOffer with embedded aiAnalysis, reads it back, then deletes it", async () => {
    try {
      const upserted = await prisma.jobOffer.upsert({
        where: { jobId: TEST_JOB_ID },
        create: {
          jobId: TEST_JOB_ID,
          title: "Senior Software Engineer",
          format: "Remote",
          salary: "€70,000 - €90,000",
          linkedinUrl: "https://www.linkedin.com/jobs/view/integration-test",
          description: "Integration test job offer.",
          requirements: ["TypeScript", "Prisma", "MongoDB"],
          aiAnalysis: {
            whyItFits: "Strong match on stack and seniority.",
            score: 92,
          },
        },
        update: {},
      });

      expect(upserted.jobId).toBe(TEST_JOB_ID);

      const found = await prisma.jobOffer.findUniqueOrThrow({
        where: { jobId: TEST_JOB_ID },
      });

      expect(found.title).toBe("Senior Software Engineer");
      expect(found.format).toBe("Remote");
      expect(found.salary).toBe("€70,000 - €90,000");
      expect(found.linkedinUrl).toBe(
        "https://www.linkedin.com/jobs/view/integration-test",
      );
      expect(found.requirements).toEqual(["TypeScript", "Prisma", "MongoDB"]);
      expect(found.aiAnalysis).toEqual({
        whyItFits: "Strong match on stack and seniority.",
        score: 92,
      });
    } finally {
      await prisma.jobOffer.deleteMany({ where: { jobId: TEST_JOB_ID } });
    }
  });

  it("persists descriptionHash end-to-end: mapper → upsert → read-back", async () => {
    try {
      const apifyItem: ApifyLinkedInJobItem = {
        jobId: TEST_JOB_ID,
        jobUrl: "https://www.linkedin.com/jobs/view/integration-test",
        jobTitle: "Senior Software Engineer",
        jobDescription: TEST_DESCRIPTION,
      };
      const { jobId, ...fields } = mapApifyItemToJobOffer(apifyItem);

      await prisma.jobOffer.upsert({
        where: { jobId },
        create: { jobId, ...fields },
        update: fields,
      });

      const found = await prisma.jobOffer.findUniqueOrThrow({
        where: { jobId: TEST_JOB_ID },
      });

      expect(found.descriptionHash).toBe(fields.descriptionHash);
    } finally {
      await prisma.jobOffer.deleteMany({ where: { jobId: TEST_JOB_ID } });
    }
  });
});
