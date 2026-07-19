import * as fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("node:fs");
  vi.resetModules();
});

describe("readCvMetadata — env var path (Vercel / production)", () => {
  it("returns the decoded CV's UTF-8 byte size when CV_TEXT is set", async () => {
    const cvText = "PABLO VINIEGRA\nSenior Engineer";
    vi.stubEnv("CV_TEXT", Buffer.from(cvText).toString("base64"));
    vi.resetModules();

    const { readCvMetadata } = await import("./cv");

    expect(readCvMetadata()).toEqual({
      filename: "CV_2026.pdf",
      sizeBytes: Buffer.byteLength(cvText, "utf-8"),
    });
  });

  it("does not touch the filesystem when CV_TEXT is set (production-safe)", async () => {
    vi.stubEnv("CV_TEXT", Buffer.from("hello").toString("base64"));
    vi.resetModules();
    const statSyncSpy = vi.fn(() => {
      throw new Error("statSync should not be called");
    });
    vi.doMock("node:fs", () => ({ ...fs, statSync: statSyncSpy }));
    const { readCvMetadata } = await import("./cv");

    expect(readCvMetadata()).not.toBeNull();
    expect(statSyncSpy).not.toHaveBeenCalled();
  });

  it("treats empty CV_TEXT as not-set and falls through to disk", async () => {
    vi.stubEnv("CV_TEXT", "");
    vi.resetModules();

    const { readCvMetadata } = await import("./cv");
    const metadata = readCvMetadata();

    expect(metadata?.filename).toBe("CV_2026.pdf");
    expect(metadata?.sizeBytes).toBeGreaterThan(0);
  });
});

describe("readCvMetadata — fs fallback (local dev when CV_TEXT is unset)", () => {
  it("returns the on-disk file size when CV_TEXT is unset", async () => {
    vi.stubEnv("CV_TEXT", "");
    vi.resetModules();

    const { readCvMetadata } = await import("./cv");
    const expectedSize = fs.statSync(
      path.join(process.cwd(), "cv", "CV_2026.pdf"),
    ).size;

    expect(readCvMetadata()).toEqual({
      filename: "CV_2026.pdf",
      sizeBytes: expectedSize,
    });
  });

  it("returns null when the on-disk file is missing", async () => {
    vi.stubEnv("CV_TEXT", "");
    vi.resetModules();
    vi.doMock("node:fs", () => ({
      ...fs,
      statSync: vi.fn(() => {
        throw new Error("ENOENT");
      }),
    }));

    const { readCvMetadata } = await import("./cv");

    expect(readCvMetadata()).toBeNull();
  });
});
