import { readFileSync } from "node:fs";
import path from "node:path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

let cached: string | undefined;

export async function loadCV(): Promise<string> {
  if (cached !== undefined) return cached;

  const cvText = process.env.CV_TEXT;
  if (cvText && cvText.length > 0) {
    cached = Buffer.from(cvText, "base64").toString("utf-8");
    return cached;
  }

  const buffer = readFileSync(path.join(process.cwd(), "cv", "CV_2026.pdf"));
  const text = await pdfParse(buffer).then((result) => result.text);
  cached = text;
  return text;
}
