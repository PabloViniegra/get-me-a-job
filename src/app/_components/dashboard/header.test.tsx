import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../shared/relative-time", () => ({
  RelativeTime: () => null,
}));
vi.mock("../shared/theme-toggle", () => ({
  ThemeToggle: () => null,
}));
vi.mock("./header-subtitle-skeleton", () => ({
  HeaderSubtitleSkeleton: () => null,
}));

import { DashboardHeader } from "./header";

describe("DashboardHeader", () => {
  it("makes the refresh state visible while data is loading", () => {
    const markup = renderToStaticMarkup(
      <DashboardHeader
        subtitleLabel={12}
        isSubtitleLoading={false}
        newestCreatedAt={null}
        isRefreshing
        onRefresh={() => undefined}
      />,
    );

    expect(markup).toContain("Recargando…");
    expect(markup).toContain("Recargando datos");
    expect(markup).toContain("animate-spin");
  });
});
