"use client";

import { Card, Chip } from "@heroui/react";
import type { JobCardData } from "@/lib/jobs.dto";

type JobCardProps = { data: JobCardData };

export function JobCard({ data }: JobCardProps) {
  return (
    <Card className="rounded-lg border border-border p-4">
      <Card.Header className="flex-row items-center justify-between gap-3">
        <Card.Title className="text-base leading-[1.4] font-semibold text-foreground">
          {data.title}
        </Card.Title>
        <Chip>{data.format}</Chip>
      </Card.Header>
      <Card.Content className="gap-3">
        <p className="line-clamp-3 text-sm leading-[1.5] font-normal text-foreground">
          {data.descriptionPreview}
        </p>
        <p className="text-sm leading-[1.5] font-normal text-muted">
          {data.salary ?? "Not disclosed"}
        </p>
      </Card.Content>
    </Card>
  );
}
