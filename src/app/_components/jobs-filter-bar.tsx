"use client";

import { Button, Input, Label, TextField, ToggleButton } from "@heroui/react";
import { useState } from "react";
import type { Format } from "@/lib/dashboard-filters";
import type { ScoreTier } from "@/lib/score-tier";

type JobsFilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  formats: ReadonlyArray<Format>;
  onToggleFormat: (format: Format) => void;
  tiers: ReadonlyArray<ScoreTier>;
  onToggleTier: (tier: ScoreTier) => void;
  activeFacetCount: number;
  onClearAll: () => void;
};

const FORMAT_OPTIONS: ReadonlyArray<Format> = ["Remote", "Hybrid", "On-site"];

const TIER_OPTIONS: ReadonlyArray<{ tier: ScoreTier; label: string }> = [
  { tier: "excellent", label: "Excelente" },
  { tier: "worth", label: "Vale la pena" },
  { tier: "low", label: "Bajo" },
  { tier: "pending", label: "Sin analizar" },
];

export function JobsFilterBar({
  value,
  onChange,
  resultCount,
  formats,
  onToggleFormat,
  tiers,
  onToggleTier,
  activeFacetCount,
  onClearAll,
}: JobsFilterBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <TextField
        className="w-full"
        name="jobs-search"
        value={value}
        onChange={(next: string) => onChange(next)}
      >
        <Label className="sr-only">Buscar ofertas</Label>
        <Input type="search" placeholder="Buscar por título…" />
      </TextField>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={isPanelOpen}
          aria-controls="jobs-filter-panel"
          onPress={() => setIsPanelOpen((current) => !current)}
        >
          Filtros
          {activeFacetCount > 0 ? (
            <>
              <span
                aria-hidden="true"
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 font-mono text-xs leading-none tabular-nums text-accent-foreground"
              >
                {activeFacetCount}
              </span>
              <span className="sr-only">
                {activeFacetCount} filtros activos
              </span>
            </>
          ) : null}
        </Button>
      </div>
      <section
        id="jobs-filter-panel"
        aria-label="Filtros de ofertas"
        hidden={!isPanelOpen}
        className="rounded-lg border border-border bg-surface p-3"
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              isDisabled={activeFacetCount === 0}
              onPress={onClearAll}
            >
              Limpiar todo
            </Button>
          </div>
          <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0 m-0">
            <legend className="sr-only">Filtrar por modalidad</legend>
            {FORMAT_OPTIONS.map((format) => (
              <ToggleButton
                key={format}
                size="sm"
                variant="ghost"
                isSelected={formats.includes(format)}
                onChange={() => onToggleFormat(format)}
                aria-label={`Filtrar por ${format}`}
              >
                {format}
              </ToggleButton>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0 m-0">
            <legend className="sr-only">Filtrar por tier</legend>
            {TIER_OPTIONS.map(({ tier, label }) => (
              <ToggleButton
                key={tier}
                size="sm"
                variant="ghost"
                isSelected={tiers.includes(tier)}
                onChange={() => onToggleTier(tier)}
                aria-label={`Filtrar por ${label}`}
              >
                {label}
              </ToggleButton>
            ))}
          </fieldset>
        </div>
      </section>
      <p className="text-xs leading-[1.4] text-muted" aria-live="polite">
        Mostrando {resultCount} oferta{resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
