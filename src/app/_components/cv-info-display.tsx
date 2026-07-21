import { Chip } from "@heroui/react/chip";
import { FileText } from "lucide-react";

export type CvInfoDisplayProps = {
  filename: string;
  sizeBytes: number;
};

const KB_BYTES = 1024;

export function buildCvChipLabel(filename: string, sizeBytes: number): string {
  const kb = sizeBytes / KB_BYTES;
  return `${filename} · ${kb.toFixed(kb < 10 ? 2 : 1)} KB`;
}

export function CvInfoDisplay({ filename, sizeBytes }: CvInfoDisplayProps) {
  return (
    <Chip variant="secondary" size="sm" className="font-mono">
      <FileText size={12} aria-hidden="true" />
      <Chip.Label>{buildCvChipLabel(filename, sizeBytes)}</Chip.Label>
    </Chip>
  );
}
