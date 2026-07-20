"use client";
"use no memo";

import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { Link } from "@heroui/react/link";
import { Modal } from "@heroui/react/modal";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import type { JobCardData } from "@/lib/jobs.dto";
import { MatchScoreChip } from "./match-score-chip";
import { RelativeTime } from "./relative-time";

type JobDetailModalProps = {
  data: JobCardData | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const HTTP_URL_PATTERN = /^https?:\/\//;
const SALARY_MISSING = "No publicado";
const PARAGRAPH_SPLIT = /\n\n|\n/;
const SECTION_STAGGER_STEP = 0.05;
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] satisfies [
  number,
  number,
  number,
  number,
];

function paragraphs(text: string): ReadonlyArray<string> {
  return text
    .split(PARAGRAPH_SPLIT)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function JobDetailModal({
  data,
  isOpen,
  onOpenChange,
}: JobDetailModalProps) {
  if (data === null) return null;

  const descriptionParagraphs = paragraphs(data.description);
  const whyItFitsParagraphs = data.whyItFits ? paragraphs(data.whyItFits) : [];
  const linkedinHref = HTTP_URL_PATTERN.test(data.linkedinUrl)
    ? data.linkedinUrl
    : null;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} variant="blur">
      <Modal.Container size="lg" scroll="inside" className="p-3 sm:p-6">
        <MotionConfig reducedMotion="user">
          <LazyMotion features={domAnimation}>
            <Modal.Dialog className="overflow-hidden rounded-2xl border border-border-secondary">
              <Modal.CloseTrigger />
              <m.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE_OUT_QUINT }}
              >
                <Modal.Header className="flex-col items-stretch gap-5 border-b border-separator px-5 py-5 pr-14 sm:px-6 sm:py-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <Modal.Icon className="mt-0.5 shrink-0 bg-default text-foreground">
                      <BriefcaseBusiness
                        aria-hidden="true"
                        className="size-5"
                      />
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
              </m.div>

              <Modal.Body className="gap-0 px-5 py-0 sm:px-6">
                <m.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.22,
                    ease: EASE_OUT_QUINT,
                    delay: SECTION_STAGGER_STEP,
                  }}
                >
                  <dl className="grid grid-cols-1 gap-4 border-b border-separator py-5 sm:grid-cols-3">
                    <div>
                      <dt className="font-mono text-xs uppercase tracking-wider text-muted">
                        Salario
                      </dt>
                      <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
                        {data.salary ?? SALARY_MISSING}
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
                </m.div>

                {whyItFitsParagraphs.length > 0 ? (
                  <m.section
                    aria-labelledby="job-detail-match-reason"
                    className="border-b border-separator py-6"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      ease: EASE_OUT_QUINT,
                      delay: SECTION_STAGGER_STEP * 2,
                    }}
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
                  </m.section>
                ) : null}

                <m.section
                  aria-labelledby="job-detail-description"
                  className="border-b border-separator py-6"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.22,
                    ease: EASE_OUT_QUINT,
                    delay: SECTION_STAGGER_STEP * 3,
                  }}
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
                        <p key={`${data.id}-description-${index}`}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      No hay descripción disponible.
                    </p>
                  )}
                </m.section>

                {data.allRequirements.length > 0 ? (
                  <m.section
                    aria-labelledby="job-detail-requirements"
                    className="py-6"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      ease: EASE_OUT_QUINT,
                      delay: SECTION_STAGGER_STEP * 4,
                    }}
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
                  </m.section>
                ) : null}

                <m.p
                  className="pb-6 font-mono text-xs text-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.22,
                    ease: EASE_OUT_QUINT,
                    delay: SECTION_STAGGER_STEP * 5,
                  }}
                >
                  jobId · <span className="tabular-nums">{data.jobId}</span>
                </m.p>
              </Modal.Body>

              <m.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  ease: EASE_OUT_QUINT,
                  delay: SECTION_STAGGER_STEP * 6,
                }}
              >
                <Modal.Footer className="flex-col items-stretch gap-2 border-t border-separator px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <Button
                    className="transition-transform duration-150 active:scale-[0.97]"
                    variant="tertiary"
                    slot="close"
                  >
                    Cerrar
                  </Button>
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
              </m.div>
            </Modal.Dialog>
          </LazyMotion>
        </MotionConfig>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
