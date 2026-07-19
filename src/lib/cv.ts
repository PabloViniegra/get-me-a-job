import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const CV_FILENAME = "CV_2026.pdf";
const CV_DISK_PATH = path.join("cv", CV_FILENAME);

let cached: string | undefined;

export async function loadCV(): Promise<string> {
  if (cached !== undefined) return cached;

  const cvText = process.env.CV_TEXT;
  if (cvText && cvText.length > 0) {
    cached = Buffer.from(cvText, "base64").toString("utf-8");
    return cached;
  }

  const buffer = readFileSync(path.join(process.cwd(), CV_DISK_PATH));
  const text = await pdfParse(buffer).then((result) => result.text);
  cached = text;
  return text;
}

export type CvMetadata = {
  filename: string;
  sizeBytes: number;
};

export function readCvMetadata(): CvMetadata | null {
  const cvText = process.env.CV_TEXT;
  if (cvText && cvText.length > 0) {
    const decoded = Buffer.from(cvText, "base64").toString("utf-8");
    return {
      filename: CV_FILENAME,
      sizeBytes: Buffer.byteLength(decoded, "utf-8"),
    };
  }

  try {
    const stats = statSync(path.join(process.cwd(), CV_DISK_PATH));
    return {
      filename: CV_FILENAME,
      sizeBytes: stats.size,
    };
  } catch {
    return null;
  }
}
