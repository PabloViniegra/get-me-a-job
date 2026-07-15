"use client";

import { Card } from "@heroui/react";
import type { JobCardData } from "@/lib/jobs.dto";

type JobCardProps = { data: JobCardData };

export function JobCard({ data }: JobCardProps) {
  return (
    <Card className="rounded-lg border border-border">
      <Card.Header>
        <Card.Title className="text-base leading-[1.4] font-semibold text-foreground">
          {data.title}
        </Card.Title>
      </Card.Header>
      <Card.Content className="gap-2">
        <p className="line-clamp-3 text-sm leading-[1.5] font-normal text-foreground">
          {data.descriptionPreview}
        </p>
      </Card.Content>
    </Card>
  );
}
