const PARAGRAPH_SPLIT = /\n\n|\n/;

export function splitParagraphs(text: string): ReadonlyArray<string> {
  return text
    .split(PARAGRAPH_SPLIT)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function firstParagraph(text: string): string {
  return splitParagraphs(text)[0] ?? "";
}
