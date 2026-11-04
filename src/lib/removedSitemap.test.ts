import { describe, expect, it } from "vitest";
import { removedPaths } from "@/lib/removedSitemap";

describe("removedPaths", () => {
  const paths = removedPaths();
  it("noindex 페이지만 담는다", () => {
    expect(paths).toContain("/weather/seoul/11");
    expect(paths).toContain("/overseas/tokyo/forecast");
    expect(paths).toContain("/en");
    expect(paths).toContain("/ja/weather/seoul/11");
    expect(paths).not.toContain("/ja");
    expect(paths).not.toContain("/weather/seoul");
    expect(new Set(paths).size).toBe(paths.length);
  });
});
