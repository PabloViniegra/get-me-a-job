import { readCvMetadata } from "@/lib/cv";
import { CvInfoDisplay } from "./cv-info-display";

export async function CvInfo() {
  const metadata = readCvMetadata();
  if (!metadata) return null;
  return <CvInfoDisplay {...metadata} />;
}
