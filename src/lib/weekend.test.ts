import { describe, expect, it } from "vitest";
import { weekendScore, type WeekendDay } from "@/lib/weekend";

const day = (o: Partial<WeekendDay>): WeekendDay => ({ date: "2026-10-24", tMin: 10, tMax: 22, rain: 0, prob: 0, wind: 3, gust: 5, code: 1, ...o });

describe("weekendScore", () => {
  it("맑고 선선하면 만점", () => {
    expect(weekendScore([day({}), day({})], "camping")).toBe(10);
  });
  it("비가 오면 크게 깎인다", () => {
    expect(weekendScore([day({ rain: 6, prob: 80 }), day({})], "camping")).toBeLessThan(4);
  });
  it("낚시는 같은 바람에도 더 깎인다", () => {
    const d = [day({ gust: 10 })];
    expect(weekendScore(d, "fishing")).toBeLessThan(weekendScore(d, "hiking"));
  });
  it("스키장은 눈이 와도, 추워도 깎지 않는다", () => {
    expect(weekendScore([day({ tMin: -12, tMax: -3, rain: 5, prob: 90, code: 73 })], "ski")).toBe(10);
  });
});
