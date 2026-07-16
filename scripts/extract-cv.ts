import { readFileSync } from "node:fs";
import path from "node:path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const CV_PATH = path.join(process.cwd(), "cv", "CV_2026.pdf");
const buffer = readFileSync(CV_PATH);
const { text } = await pdfParse(buffer);
const base64 = Buffer.from(text).toString("base64");

console.log(
  `# CV extracted: ${text.length} chars → ${base64.length} base64 chars`,
);
console.log(`CV_TEXT="${base64}"`);
