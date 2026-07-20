"use client";
"use no memo";

import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Link } from "@heroui/react/link";
import { ArrowUpRight, ChevronRight, Clock } from "lucide-react";
import type { JobCardData } from "@/lib/jobs.dto";
import { MatchScoreChip } from "./match-score-chip";
import { RelativeTime } from "./relative-time";

type JobCardProps = {
  data: JobCardData;
  onViewDetails: (data: JobCardData) => void;
};

const HTTP_URL_PATTERN = /^https?:\/\//;
const SALARY_MISSING = "—";

export function JobCard({ data, onViewDetails }: JobCardProps) {
  const linkedinHref = HTTP_URL_PATTERN.test(data.linkedinUrl)
    ? data.linkedinUrl
    : null;

  const requirementCount = data.requirements.length;

  return (
    <Card className="h-full rounded-lg border border-border p-4 transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-px hover:border-border-secondary hover:shadow-[var(--surface-shadow)]">
      <Card.Header className="flex-col items-stretch gap-2">
        <div className="flex flex-row items-start justify-between gap-3">
          <Card.Title className="text-base leading-[1.4] font-semibold text-foreground">
            {data.title}
          </Card.Title>
          <MatchScoreChip
            score={data.score}
            hasAiAnalysis={data.hasAiAnalysis}
          />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-wider text-muted">
          <span>{data.format}</span>
          {requirementCount > 0 ? (
            <>
              <span aria-hidden="true" className="text-border-secondary">
                ·
              </span>
              <span>
                {data.requirements.join(" · ")}
                {data.requirementsOverflowCount > 0
                  ? ` · +${data.requirementsOverflowCount}`
                  : ""}
              </span>
            </>
          ) : null}
        </div>
      </Card.Header>
      <Card.Content className="gap-3">
        <p className="line-clamp-3 text-pretty text-sm leading-[1.5] font-normal text-foreground">
          {data.descriptionPreview}
        </p>
        <p className="font-mono text-sm leading-[1.5] tabular-nums text-foreground">
          {data.salary ?? (
            <span className="text-muted" title="Salario no publicado">
              <span aria-hidden="true">{SALARY_MISSING}</span>
              <span className="sr-only">Salario no publicado</span>
            </span>
          )}
        </p>
        {data.whyItFitsPreview ? (
          <div className="flex flex-col gap-1 pt-1">
            <span className="font-mono text-xs italic text-muted">
              {"// por qué encaja"}
            </span>
            <p className="text-sm leading-[1.5] font-normal text-foreground">
              {data.whyItFitsPreview}
            </p>
          </div>
        ) : null}
      </Card.Content>
      <Card.Footer className="flex flex-wrap items-center justify-between gap-2 border-t border-separator pt-3">
        <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted">
          <Clock aria-hidden="true" size={12} />
          <RelativeTime date={data.createdAt} />
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            className="transition-transform duration-150 active:scale-[0.97]"
            size="sm"
            variant="ghost"
            onPress={() => onViewDetails(data)}
          >
            Ver detalles
            <ChevronRight aria-hidden="true" size={14} />
          </Button>
          {linkedinHref ? (
            <Link
              href={linkedinHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver "${data.title}" en LinkedIn (se abre en una pestaña nueva)`}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs transition-[color,transform] duration-150 ease-out hover:-translate-y-px"
            >
              LinkedIn
              <ArrowUpRight aria-hidden="true" size={12} strokeWidth={2} />
            </Link>
          ) : null}
        </div>
      </Card.Footer>
    </Card>
  );
}
