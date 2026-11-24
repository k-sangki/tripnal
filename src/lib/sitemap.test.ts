import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  const list = sitemap();

  it("모든 주소에 실제 변경 날짜(lastmod)가 있다", () => {
    const missing = list.filter((e) => !e.lastModified).map((e) => e.url);
    expect(missing).toEqual([]);
    for (const e of list) expect(Number.isNaN(Date.parse(String(e.lastModified)))).toBe(false);
  });

  it("모든 주소가 같은 날짜는 아니다 (빌드 시각을 넣지 않는다)", () => {
    expect(new Set(list.map((e) => String(e.lastModified).slice(0, 10))).size).toBeGreaterThan(3);
  });

  it("changefreq·priority를 넣지 않는다", () => {
    expect(list.some((e) => e.changeFrequency || e.priority)).toBe(false);
  });
});
