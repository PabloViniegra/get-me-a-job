import * as fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCV } from "./cv";

afterEach(() => {
  vi.doUnmock("node:fs");
  vi.resetModules();
});

describe("loadCV", () => {
  it("returns the parsed plain text of cv/CV_2026.pdf containing a known marker", async () => {
    const text = await loadCV();

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("PABLO VINIEGRA");
  });

  it("returns identical text across consecutive calls (module-level cache)", async () => {
    const first = await loadCV();
    const second = await loadCV();

    expect(second).toBe(first);
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
