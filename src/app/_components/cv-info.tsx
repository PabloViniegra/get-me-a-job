import { statSync } from "node:fs";
import path from "node:path";
import { CvInfoDisplay, type CvInfoDisplayProps } from "./cv-info-display";

const CV_RELATIVE_PATH = path.join("cv", "CV_2026.pdf");

function readCvMetadata(): CvInfoDisplayProps | null {
  try {
    const stats = statSync(path.join(process.cwd(), CV_RELATIVE_PATH));
    return {
      filename: path.basename(CV_RELATIVE_PATH),
      sizeBytes: stats.size,
    };
  } catch {
    return null;
  }
}

export async function CvInfo() {
  const metadata = readCvMetadata();
  if (!metadata) return null;
  return <CvInfoDisplay {...metadata} />;
}
