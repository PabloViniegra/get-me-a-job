import * as fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCV } from "./cv";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("loadCV — env var path (Vercel / production)", () => {
  it("decodes the base64 CV_TEXT env var instead of reading disk", async () => {
    const cvText = "PABLO VINIEGRA\nSenior Engineer";
    vi.stubEnv("CV_TEXT", Buffer.from(cvText).toString("base64"));
    vi.resetModules();

    const { loadCV: loadCVFresh } = await import("./cv");
    const text = await loadCVFresh();

    expect(text).toBe(cvText);
  });

  it("treats empty CV_TEXT as not-set and falls through to disk", async () => {
    vi.stubEnv("CV_TEXT", "");
    vi.resetModules();

    const text = await loadCV();

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("returns identical text across consecutive calls (module cache)", async () => {
    const cvText = "PABLO VINIEGRA\nSenior Engineer";
    vi.stubEnv("CV_TEXT", Buffer.from(cvText).toString("base64"));
    vi.resetModules();

    const { loadCV: loadCVFresh } = await import("./cv");
    const first = await loadCVFresh();
    const second = await loadCVFresh();

    expect(second).toBe(first);
  });
});

describe("loadCV — fs fallback (local dev when CV_TEXT is unset)", () => {
  beforeEach(() => {
    vi.stubEnv("CV_TEXT", "");
    vi.resetModules();
  });

  it("returns the parsed plain text of cv/CV_2026.pdf containing a known marker", async () => {
    const text = await loadCV();

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("PABLO VINIEGRA");
  });

  it("throws when fs.readFileSync fails", async () => {
    vi.doMock("node:fs", () => ({
      ...fs,
      readFileSync: vi.fn(() => {
        throw new Error("ENOENT");
      }),
    }));
    const { loadCV: loadCVFresh } = await import("./cv");

    await expect(loadCVFresh()).rejects.toThrow("ENOENT");
  });

  it("re-attempts fs on next call when a previous call failed (failure does not poison cache)", async () => {
    let calls = 0;
    const readFileSyncSpy = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        throw new Error("transient");
      }
      return fs.readFileSync(path.join(process.cwd(), "cv", "CV_2026.pdf"));
    });
    vi.doMock("node:fs", () => ({
      ...fs,
      readFileSync: readFileSyncSpy,
    }));
    const { loadCV: loadCVFresh } = await import("./cv");

    await expect(loadCVFresh()).rejects.toThrow("transient");

    const text = await loadCVFresh();

    expect(text).toContain("PABLO VINIEGRA");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(2);
  });

  it("calls fs.readFileSync exactly once across two loadCV() calls (module cache)", async () => {
    const readFileSyncSpy = vi.fn(
      (...args: Parameters<typeof fs.readFileSync>) => fs.readFileSync(...args),
    );
    vi.doMock("node:fs", () => ({
      ...fs,
      readFileSync: readFileSyncSpy,
    }));
    const { loadCV: loadCVFresh } = await import("./cv");

    await loadCVFresh();
    await loadCVFresh();

    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(readFileSyncSpy).toHaveBeenCalledWith(
      expect.stringMatching(/cv[/\\]CV_2026\.pdf$/u),
    );
  });
});
