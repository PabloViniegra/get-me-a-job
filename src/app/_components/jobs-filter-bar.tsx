"use client";

import { Input, Label, TextField } from "@heroui/react";

type JobsFilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
};

export function JobsFilterBar({
  value,
  onChange,
  resultCount,
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
      <p className="text-xs leading-[1.4] text-muted" aria-live="polite">
        Mostrando {resultCount} oferta{resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
