"use client";
"use no memo";

import { Card, Chip } from "@heroui/react";
import type { JobCardData } from "@/lib/jobs.dto";
import { ChatStubButton } from "./chat-stub-button";
import { MatchScoreChip } from "./match-score-chip";

type JobCardProps = { data: JobCardData };

export function JobCard({ data }: JobCardProps) {
  return (
    <Card className="rounded-lg border border-border p-4">
      <Card.Header className="flex-col items-stretch gap-2">
        <div className="flex flex-row items-center justify-between gap-3">
          <Card.Title className="text-base leading-[1.4] font-semibold text-foreground">
            {data.title}
          </Card.Title>
          <MatchScoreChip
            score={data.score}
            hasAiAnalysis={data.hasAiAnalysis}
          />
        </div>
        <div className="flex flex-row">
          <Chip>{data.format}</Chip>
        </div>
      </Card.Header>
      <Card.Content className="gap-3">
        <p className="line-clamp-3 text-sm leading-[1.5] font-normal text-foreground">
          {data.descriptionPreview}
        </p>
        <p className="text-sm leading-[1.5] font-normal text-muted">
          {data.salary ?? "Not disclosed"}
        </p>
      </Card.Content>
      <Card.Footer className="flex flex-row justify-end">
        <ChatStubButton />
      </Card.Footer>
    </Card>
  );
}
