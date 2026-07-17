import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gradeJob, type JobSnapshot } from "./grader";

const JOB: JobSnapshot = {
  jobId: "job-1",
  title: "Senior TypeScript Engineer",
  linkedinUrl: "https://linkedin.com/jobs/view/1",
  description: "Build cool things with TypeScript.",
  salary: "EUR 60k-80k",
  format: "Remote",
  requirements: ["TypeScript", "React", "5+ years"],
};

const CV_TEXT = "Pablo Viniegra - Senior Software Engineer.";

function logText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .map((call: readonly unknown[]) => call[0] as string)
    .join("\n");
}

describe("gradeJob", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("returns a typed AiAnalysis when the client returns valid JSON within schema (happy path)", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ score: 87, whyItFits: "Strong TypeScript match." }),
      );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toEqual({
      score: 87,
      whyItFits: "Strong TypeScript match.",
    });
    const log = logText(infoSpy);
    expect(log).toContain("[grading] start");
    expect(log).toContain("jobId=job-1");
    expect(log).toContain("[grading] ok");
    expect(log).toContain("score=87");
  });

  it("returns null with reason=parse when the client returns malformed JSON", async () => {
    const complete = vi.fn().mockResolvedValue("not json at all");
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toBeNull();
    expect(logText(infoSpy)).toContain("reason=parse");
  });

  it("strips a prose preamble before the JSON object", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(
        `Here is the JSON response based on the provided information:\n\n${JSON.stringify(
          { score: 88, whyItFits: "Strong match." },
        )}`,
      );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toEqual({ score: 88, whyItFits: "Strong match." });
  });

  it("strips trailing prose after the JSON object", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(
        `${JSON.stringify({ score: 72, whyItFits: "Decent." })}\nI hope this helps with your decision.`,
      );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toEqual({ score: 72, whyItFits: "Decent." });
  });

  it("strips both preamble and trailing prose around the JSON object", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(
        `Sure! Here you go:\n${JSON.stringify({ score: 91, whyItFits: "Excellent." })}\nLet me know if you need anything else.`,
      );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toEqual({ score: 91, whyItFits: "Excellent." });
  });

  it("strips a markdown json code fence around the JSON object", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(
        `\`\`\`json\n${JSON.stringify({ score: 65, whyItFits: "Ok." })}\n\`\`\``,
      );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toEqual({ score: 65, whyItFits: "Ok." });
  });

  it("returns null with reason=validation when required fields are missing", async () => {
    const complete = vi.fn().mockResolvedValue(JSON.stringify({}));
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toBeNull();
    expect(logText(infoSpy)).toContain("reason=validation");
  });

  it("returns null with reason=validation when score is out of range", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ score: 150, whyItFits: "too good" }));
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toBeNull();
    expect(logText(infoSpy)).toContain("reason=validation");
  });

  it("returns null with reason=validation when whyItFits exceeds 1500 chars", async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ score: 50, whyItFits: "a".repeat(1501) }),
      );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toBeNull();
    expect(logText(infoSpy)).toContain("reason=validation");
  });

  it("returns null with reason=network when the client throws", async () => {
    const complete = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toBeNull();
    expect(logText(infoSpy)).toContain("reason=network");
  });

  it("returns null with reason=timeout when the abort signal fires mid-call", async () => {
    const stubController = new AbortController();
    const complete = vi.fn().mockImplementation(
      (_prompt: string, opts?: { signal?: AbortSignal }) =>
        new Promise<string>((_resolve, reject) => {
          const onAbort = () =>
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          opts?.signal?.addEventListener("abort", onAbort);
          stubController.signal.addEventListener("abort", onAbort);
          setTimeout(() => stubController.abort(), 0);
        }),
    );
    const result = await gradeJob({
      client: { complete },
      cvText: CV_TEXT,
      job: JOB,
    });

    expect(result).toBeNull();
    expect(logText(infoSpy)).toContain("reason=timeout");
  });

  it("never logs the CV text - redaction guardrail (PRD section 5)", async () => {
    const cvMarker = "CV_POISON_MARKER_42_unique_string";
    const poisonedCv = `${CV_TEXT}\n${cvMarker}`;
    const complete = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ score: 80, whyItFits: "ok" }));

    await gradeJob({
      client: { complete },
      cvText: poisonedCv,
      job: JOB,
    });

    const log = logText(infoSpy);
    expect(log).not.toContain(cvMarker);
  });
});
