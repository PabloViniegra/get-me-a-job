"use client";

import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { Link } from "@heroui/react/link";
import { Modal } from "@heroui/react/modal";
import { ArrowUpRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { SALARY_MISSING_LONG } from "@/lib/job";
import { splitParagraphs } from "@/lib/text/paragraphs";
import { isHttpUrl } from "@/lib/url";
import type { JobCardData } from "@/server/jobs/dto";
import { CoverLetterSection } from "../cover-letter/section";
import { RelativeTime } from "../shared/relative-time";
import { MatchScoreChip } from "./match-score-chip";

type InitialSection = "details" | "cover-letter";

type JobDetailModalProps = {
  data: JobCardData | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialSection?: InitialSection;
};

const COVER_LETTER_SECTION_ID = "job-detail-cover-letter";

function scrollToCoverLetter(): void {
  document
    .getElementById(COVER_LETTER_SECTION_ID)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function JobDetailModal({
  data,
  isOpen,
  onOpenChange,
  initialSection = "details",
}: JobDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    if (initialSection !== "cover-letter") return;
    const id = requestAnimationFrame(() => {
      scrollToCoverLetter();
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, initialSection]);

  const descriptionParagraphs = useMemo(
    () => (data ? splitParagraphs(data.description) : []),
    [data],
  );
  const whyItFitsParagraphs = useMemo(
    () => (data?.whyItFits ? splitParagraphs(data.whyItFits) : []),
    [data],
  );
  const linkedinHref =
    data && isHttpUrl(data.linkedinUrl) ? data.linkedinUrl : null;

  if (data === null) return null;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} variant="blur">
      <Modal.Container size="lg" scroll="inside" className="p-3 sm:p-6">
        <Modal.Dialog className="overflow-hidden rounded-2xl border border-border-secondary sm:max-w-2xl">
          <Modal.CloseTrigger />

          <Modal.Header className="flex-col items-stretch gap-5 border-b border-separator px-5 py-5 pr-14 sm:px-6 sm:py-6">
            <div className="flex min-w-0 items-start gap-3">
              <Modal.Icon className="mt-0.5 shrink-0 bg-default text-foreground">
                <BriefcaseBusiness aria-hidden="true" className="size-5" />
              </Modal.Icon>
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted">
                  Detalle de oferta
                </p>
                <Modal.Heading className="text-balance text-xl leading-[1.25] font-semibold tracking-[-0.01em] text-foreground">
                  {data.title}
                </Modal.Heading>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="secondary">
                    {data.format}
                  </Chip>
                  <span className="font-mono text-xs text-muted">
                    Encontrada <RelativeTime date={data.createdAt} />
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-separator pt-4 sm:justify-end sm:border-t-0 sm:pt-0">
              <span className="font-mono text-xs uppercase tracking-wider text-muted">
                Match
              </span>
              <MatchScoreChip
                score={data.score}
                hasAiAnalysis={data.hasAiAnalysis}
              />
            </div>
          </Modal.Header>

          <Modal.Body className="gap-0 px-5 py-0 sm:px-6">
            <dl className="grid grid-cols-1 gap-4 border-b border-separator py-5 sm:grid-cols-3">
              <div>
                <dt className="font-mono text-xs uppercase tracking-wider text-muted">
                  Salario
                </dt>
                <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
                  {data.salary ?? SALARY_MISSING_LONG}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-wider text-muted">
                  Modalidad
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {data.format}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-wider text-muted">
                  Publicada
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  <RelativeTime date={data.createdAt} />
                </dd>
              </div>
            </dl>

            <CoverLetterSection
              jobId={data.jobId}
              initialLetter={data.coverLetter}
              initialRegenerations={data.coverLetterRegenerations}
              sectionId={COVER_LETTER_SECTION_ID}
            />

            {whyItFitsParagraphs.length > 0 ? (
              <section
                aria-labelledby="job-detail-match-reason"
                className="border-b border-separator py-6"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="mb-1 font-mono text-xs italic text-muted">
                      {"// por qué encaja"}
                    </p>
                    <h2
                      className="text-base font-semibold text-foreground"
                      id="job-detail-match-reason"
                    >
                      Análisis frente a tu CV
                    </h2>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-muted">
                    IA · resumen
                  </span>
                </div>
                <div className="rounded-xl bg-[var(--surface-secondary)] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 text-sm leading-[1.6] text-foreground text-pretty">
                    {whyItFitsParagraphs.map((paragraph, index) => (
                      <p key={`${data.id}-why-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section
              aria-labelledby="job-detail-description"
              className="border-b border-separator py-6"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2
                  className="text-base font-semibold text-foreground"
                  id="job-detail-description"
                >
                  Descripción del puesto
                </h2>
                <span className="font-mono text-xs uppercase tracking-wider text-muted">
                  Contexto
                </span>
              </div>
              {descriptionParagraphs.length > 0 ? (
                <div className="flex flex-col gap-3 text-sm leading-[1.6] text-foreground text-pretty">
                  {descriptionParagraphs.map((paragraph, index) => (
                    <p key={`${data.id}-description-${index}`}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No hay descripción disponible.
                </p>
              )}
            </section>

            {data.allRequirements.length > 0 ? (
              <section
                aria-labelledby="job-detail-requirements"
                className="py-6"
              >
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2
                    className="text-base font-semibold text-foreground"
                    id="job-detail-requirements"
                  >
                    Requisitos
                  </h2>
                  <span className="font-mono text-xs uppercase tracking-wider text-muted">
                    {data.allRequirements.length} requisito
                    {data.allRequirements.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.allRequirements.map((requirement, index) => (
                    <Chip
                      key={`${data.id}-requirement-${index}`}
                      size="sm"
                      variant="secondary"
                    >
                      {requirement}
                    </Chip>
                  ))}
                </div>
              </section>
            ) : null}

            <p className="pb-6 font-mono text-xs text-muted">
              jobId · <span className="tabular-nums">{data.jobId}</span>
            </p>
          </Modal.Body>

          <Modal.Footer className="flex-col items-stretch gap-2 border-t border-separator px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="transition-transform duration-150 active:scale-[0.97]"
                variant="tertiary"
                slot="close"
              >
                Cerrar
              </Button>
              <Button
                className="transition-transform duration-150 active:scale-[0.97]"
                variant="secondary"
                onPress={scrollToCoverLetter}
              >
                <Sparkles aria-hidden="true" size={14} />
                {data.coverLetter ? "Ver carta IA" : "Carta IA"}
              </Button>
            </div>
            {linkedinHref ? (
              <Link
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver "${data.title}" en LinkedIn (se abre en una pestaña nueva)`}
                className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground no-underline transition-[background-color,transform] duration-150 ease-out hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97]"
              >
                Ver oferta en LinkedIn
                <ArrowUpRight
                  aria-hidden="true"
                  className="transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  size={14}
                  strokeWidth={2}
                />
              </Link>
            ) : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
