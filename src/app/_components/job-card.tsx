"use client";
"use no memo";

import { Card, Chip, Link, TagGroup } from "@heroui/react";
import { Clock } from "lucide-react";
import type { JobCardData } from "@/lib/jobs.dto";
import { relativeJobTime } from "@/lib/relative-time";
import { ChatStubButton } from "./chat-stub-button";
import { MatchScoreChip } from "./match-score-chip";

type JobCardProps = { data: JobCardData };

const HTTP_URL_PATTERN = /^https?:\/\//;

export function JobCard({ data }: JobCardProps) {
  const linkedinHref = HTTP_URL_PATTERN.test(data.linkedinUrl)
    ? data.linkedinUrl
    : null;

  return (
    <Card className="rounded-lg border border-border p-4 transition-colors duration-150 ease-out hover:border-border-secondary">
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
        <div className="flex flex-row gap-1.5">
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
        {data.requirements.length > 0 ? (
          <TagGroup aria-label="Requisitos">
            <TagGroup.List className="flex flex-wrap gap-1.5">
              {data.requirements.map((requirement) => (
                <Chip key={requirement}>{requirement}</Chip>
              ))}
              {data.requirementsOverflowCount > 0 ? (
                <Chip>+{data.requirementsOverflowCount}</Chip>
              ) : null}
            </TagGroup.List>
          </TagGroup>
        ) : null}
        {data.whyItFitsPreview ? (
          <div className="flex flex-col gap-1 border-l-2 border-border-secondary pl-3">
            <span className="text-xs leading-[1.4] font-medium uppercase tracking-wider text-muted">
              Por qué encaja
            </span>
            <p className="text-sm leading-[1.5] font-normal text-foreground">
              {data.whyItFitsPreview}
            </p>
          </div>
        ) : null}
      </Card.Content>
      <Card.Footer className="flex flex-row items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs leading-[1.4] font-normal text-muted">
          <Clock aria-hidden="true" size={12} />
          {relativeJobTime(data.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          {linkedinHref ? (
            <Link
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs"
            >
              <Link.Icon aria-hidden="true" />
              LinkedIn
            </Link>
          ) : null}
          <ChatStubButton />
        </div>
      </Card.Footer>
    </Card>
  );
}
