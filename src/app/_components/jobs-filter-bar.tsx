"use client";

import { Button } from "@heroui/react/button";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { Separator } from "@heroui/react/separator";
import { TextField } from "@heroui/react/textfield";
import { ToggleButton } from "@heroui/react/toggle-button";
import { ToggleButtonGroup } from "@heroui/react/toggle-button-group";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { FORMAT_VALUES, type Format } from "@/lib/dashboard-filters";
import { SORT_KEYS, SORT_LABELS, type SortKey } from "@/lib/dashboard-sort";
import { type ScoreTier, TIER_LABELS, TIER_VALUES } from "@/lib/score-tier";

type JobsFilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  formats: ReadonlyArray<Format>;
  onToggleFormat: (format: Format) => void;
  tiers: ReadonlyArray<ScoreTier>;
  onToggleTier: (tier: ScoreTier) => void;
  sortKey: SortKey;
  onChangeSortKey: (key: SortKey) => void;
  activeFacetCount: number;
  onClearAll: () => void;
};

type FormatGroupProps = {
  selected: ReadonlyArray<Format>;
  onToggle: (format: Format) => void;
};

function FormatGroup({ selected, onToggle }: FormatGroupProps) {
  return (
    <ToggleButtonGroup
      selectionMode="multiple"
      selectedKeys={selected}
      onSelectionChange={(keys) => {
        const next = new Set(keys as Set<Format>);
        for (const format of FORMAT_VALUES) {
          const inNext = next.has(format);
          const inCurrent = selected.includes(format);
          if (inNext !== inCurrent) onToggle(format);
        }
      }}
      size="sm"
      aria-label="Filtrar por modalidad"
    >
      {FORMAT_VALUES.map((format) => (
        <ToggleButton key={format} id={format} size="sm">
          {format}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

type TierGroupProps = {
  selected: ReadonlyArray<ScoreTier>;
  onToggle: (tier: ScoreTier) => void;
};

function TierGroup({ selected, onToggle }: TierGroupProps) {
  return (
    <ToggleButtonGroup
      selectionMode="multiple"
      selectedKeys={selected}
      onSelectionChange={(keys) => {
        const next = new Set(keys as Set<ScoreTier>);
        for (const tier of TIER_VALUES) {
          const inNext = next.has(tier);
          const inCurrent = selected.includes(tier);
          if (inNext !== inCurrent) onToggle(tier);
        }
      }}
      size="sm"
      aria-label="Filtrar por nivel de coincidencia"
    >
      {TIER_VALUES.map((tier) => (
        <ToggleButton key={tier} id={tier} size="sm">
          {TIER_LABELS[tier]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

type SortGroupProps = {
  selected: SortKey;
  onChange: (key: SortKey) => void;
};

function SortGroup({ selected, onChange }: SortGroupProps) {
  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selected]}
      onSelectionChange={(keys) => {
        const next = Array.from(keys as Set<SortKey>)[0];
        if (next && next !== selected) onChange(next);
      }}
      size="sm"
      aria-label="Ordenar por"
    >
      {SORT_KEYS.map((key) => (
        <ToggleButton key={key} id={key} size="sm">
          {SORT_LABELS[key]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function JobsFilterBar({
  value,
  onChange,
  resultCount,
  formats,
  onToggleFormat,
  tiers,
  onToggleTier,
  sortKey,
  onChangeSortKey,
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
          <ChevronDown
            aria-hidden="true"
            className={`transition-transform duration-[220ms] ease-out motion-reduce:transition-none ${isPanelOpen ? "rotate-180" : ""}`}
          />
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
        aria-hidden={!isPanelOpen}
        data-open={isPanelOpen}
        inert={!isPanelOpen}
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-[220ms] ease-out motion-reduce:transition-none data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100"
      >
        <div className="min-h-0 overflow-hidden">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p
                className="text-sm text-muted"
                aria-live="polite"
                id="jobs-filter-panel-count"
              >
                Mostrando {resultCount} oferta{resultCount === 1 ? "" : "s"}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                isDisabled={activeFacetCount === 0}
                onPress={onClearAll}
              >
                <X aria-hidden="true" size={14} />
                Limpiar todo
              </Button>
            </div>

            <Separator variant="secondary" className="my-3" />

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="text-[13px] font-medium tracking-[0.01em] text-muted">
                Modalidad
              </legend>
              <FormatGroup selected={formats} onToggle={onToggleFormat} />
            </fieldset>

            <Separator variant="secondary" className="my-3" />

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="text-[13px] font-medium tracking-[0.01em] text-muted">
                Nivel de coincidencia
              </legend>
              <TierGroup selected={tiers} onToggle={onToggleTier} />
            </fieldset>

            <Separator variant="secondary" className="my-3" />

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="text-[13px] font-medium tracking-[0.01em] text-muted">
                Ordenar por
              </legend>
              <SortGroup selected={sortKey} onChange={onChangeSortKey} />
            </fieldset>
          </div>
        </div>
      </section>
    </div>
  );
}
