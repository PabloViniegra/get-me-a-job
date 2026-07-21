import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

const REQUIRED_INDEXES: Array<{
  key: Record<string, 1 | -1 | "text">;
  name: string;
}> = [
  {
    name: "aiAnalysis.score_-1__id_-1",
    key: { "aiAnalysis.score": -1, _id: -1 },
  },
  {
    name: "createdAt_-1__id_-1",
    key: { createdAt: -1, _id: -1 },
  },
  {
    name: "format_1__aiAnalysis.score_-1",
    key: { format: 1, "aiAnalysis.score": -1 },
  },
  {
    name: "descriptionHash_1__gradedDescriptionHash_1",
    key: { descriptionHash: 1, gradedDescriptionHash: 1 },
  },
  {
    name: "title_text",
    key: { title: "text" },
  },
];

async function main(): Promise<void> {
  for (const index of REQUIRED_INDEXES) {
    const result = await prisma.$runCommandRaw({
      createIndexes: "JobOffer",
      indexes: [{ key: index.key, name: index.name }],
    });
    const created = (result as { ok?: number }).ok === 1;
    console.log(`[ensure-indexes] name=${index.name} created=${created}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error("[ensure-indexes] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
