"use client";
"use no memo";

import { Button } from "@heroui/react/button";
import { LoaderCircle, Sparkles } from "lucide-react";
import { AnimatePresence, LazyMotion, MotionConfig, m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "./copy-button";

type CoverLetterSectionProps = {
  jobId: string;
  initialLetter: string | null;
  initialRegenerations: number;
  sectionId?: string;
};

type Phase =
  | { kind: "idle"; text: string }
  | { kind: "streaming"; text: string }
  | { kind: "rate-limited"; retryAfterMs: number; text: string }
  | { kind: "error"; message: string; text: string };

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] satisfies [
  number,
  number,
  number,
  number,
];
const SECTION_FEATURES = () =>
  import("./cover-letter-motion-features").then(
    ({ default: features }) => features,
  );
const PARAGRAPH_SPLIT = /\n\n|\n/;

function paragraphs(text: string): ReadonlyArray<string> {
  return text
    .split(PARAGRAPH_SPLIT)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

export function CoverLetterSection({
  jobId,
  initialLetter,
  initialRegenerations,
  sectionId,
}: CoverLetterSectionProps) {
  const [phase, setPhase] = useState<Phase>(() =>
    initialLetter === null
      ? { kind: "idle", text: "" }
      : { kind: "idle", text: initialLetter },
  );
  const [regenerations, setRegenerations] = useState(initialRegenerations);
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (countdownRef.current !== null) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = useCallback((retryAfterMs: number) => {
    if (countdownRef.current !== null) clearInterval(countdownRef.current);
    let remaining = retryAfterMs;
    setPhase((current) =>
      current.kind === "streaming"
        ? { kind: "rate-limited", retryAfterMs: remaining, text: current.text }
        : current,
    );
    countdownRef.current = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) {
        if (countdownRef.current !== null) clearInterval(countdownRef.current);
        setPhase((current) => ({ kind: "idle", text: current.text }));
      } else {
        setPhase((current) =>
          current.kind === "rate-limited"
            ? { ...current, retryAfterMs: remaining }
            : current,
        );
      }
    }, 1000);
  }, []);

  const handleGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase((current) => ({ kind: "streaming", text: current.text }));

    let response: Response;
    try {
      response = await fetch(`/api/cover-letter/${jobId}`, {
        method: "POST",
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setPhase((current) => ({
        kind: "error",
        message: (err as Error)?.message ?? "Error de red",
        text: current.text,
      }));
      return;
    }

    if (response.status === 429) {
      let retryAfterMs = 30_000;
      try {
        const payload = (await response.json()) as { retryAfterMs?: number };
        if (typeof payload.retryAfterMs === "number") {
          retryAfterMs = payload.retryAfterMs;
        }
      } catch {
        // ignore parse error, fall back to default
      }
      startCountdown(retryAfterMs);
      return;
    }

    if (!response.ok || !response.body) {
      setPhase((current) => ({
        kind: "error",
        message: `Error ${response.status}`,
        text: current.text,
      }));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setPhase((current) =>
          current.kind === "streaming"
            ? { kind: "streaming", text: buffer }
            : current,
        );
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setPhase((current) => ({
        kind: "error",
        message: (err as Error)?.message ?? "Stream interrumpido",
        text: current.text,
      }));
      return;
    }

    if (controller.signal.aborted) return;

    setRegenerations((count) => count + (initialLetter !== null ? 1 : 0));
    setPhase({ kind: "idle", text: buffer });
  }, [jobId, initialLetter, startCountdown]);

  const hasLetter = phase.text.length > 0;
  const isStreaming = phase.kind === "streaming";
  const isRateLimited = phase.kind === "rate-limited";
  const isError = phase.kind === "error";
  const buttonLabel = (() => {
    if (isStreaming) return "Generando…";
    if (isRateLimited) return `Espera ${formatCountdown(phase.retryAfterMs)}`;
    if (hasLetter) {
      return regenerations === 0 ? "Regenerar carta" : "Regenerar carta";
    }
    return "Generar carta con IA";
  })();

  return (
    <section
      id={sectionId}
      aria-labelledby="cover-letter-heading"
      className="border-b border-separator py-6"
      data-testid="cover-letter-section"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="mb-1 font-mono text-xs italic text-muted">
            {"// carta de presentación"}
          </p>
          <h2
            className="text-base font-semibold text-foreground"
            id="cover-letter-heading"
          >
            Carta adaptada a esta oferta
          </h2>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          IA · streaming
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={hasLetter ? "secondary" : "primary"}
          onPress={handleGenerate}
          isDisabled={isStreaming || isRateLimited}
          className="transition-transform duration-150 active:scale-[0.97]"
        >
          {isStreaming ? (
            <LoaderCircle
              aria-hidden="true"
              size={14}
              className="motion-safe:animate-spin"
            />
          ) : (
            <Sparkles aria-hidden="true" size={14} />
          )}
          {buttonLabel}
        </Button>
        {hasLetter && !isStreaming ? <CopyButton text={phase.text} /> : null}
        {initialRegenerations > 0 ? (
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            {initialRegenerations === 1
              ? "1 regeneración"
              : `${initialRegenerations} regeneraciones`}
          </span>
        ) : null}
      </div>

      {isError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {phase.message}
        </p>
      ) : null}

      {hasLetter ? (
        <MotionConfig reducedMotion="user">
          <LazyMotion features={SECTION_FEATURES}>
            <m.div
              key={isStreaming ? "streaming" : "complete"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT_QUINT }}
              className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 text-sm leading-[1.6] text-foreground text-pretty">
                <AnimatePresence initial={false}>
                  {paragraphs(phase.text).map((paragraph) => (
                    <m.p
                      key={paragraph.slice(0, 32)}
                      initial={isStreaming ? { opacity: 0.3 } : false}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18 }}
                    >
                      {paragraph}
                    </m.p>
                  ))}
                </AnimatePresence>
                {isStreaming ? (
                  <m.span
                    aria-hidden="true"
                    className="inline-block h-3 w-1 self-start rounded-sm bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                ) : null}
              </div>
            </m.div>
          </LazyMotion>
        </MotionConfig>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Pulsa el botón para que la IA redacte una carta adaptada a tu CV y a
          esta oferta. La generación consume una llamada a OpenRouter.
        </p>
      )}
    </section>
  );
}
