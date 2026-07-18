"use client";

import { Input, Label, TextField, ToggleButton } from "@heroui/react";
import type { Format } from "@/lib/dashboard-filters";

type JobsFilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  formats: ReadonlyArray<Format>;
  onToggleFormat: (format: Format) => void;
};

const FORMAT_OPTIONS: ReadonlyArray<Format> = ["Remote", "Hybrid", "On-site"];

export function JobsFilterBar({
  value,
  onChange,
  resultCount,
  formats,
  onToggleFormat,
}: JobsFilterBarProps) {
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
      <p className="text-xs leading-[1.4] text-muted" aria-live="polite">
        Mostrando {resultCount} oferta{resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
