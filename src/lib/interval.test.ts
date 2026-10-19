import { describe, expect, it } from "vitest";
import { parseInterval, regroup, slotHead } from "./interval";
import type { Slot } from "./weather/types";

const slot = (hour: number, temp: number, extra: Partial<Slot> = {}): Slot => ({
  time: `2026-10-20T${String(hour).padStart(2, "0")}:00`,
  hour,
  temp,
  feels: temp - 2,
  precip: 1,
  precipProb: hour,
  cloud: 50,
  wind: hour === 9 ? 8 : 2,
  gust: hour,
  windDir: hour * 10,
  code: 1,
  isDay: true,
  ...extra,
});
const day = [0, 3, 6, 9, 12, 15, 18, 21].map((h, i) => slot(h, [5, 4, 8, 14, 17, 15, 10, 7][i]));

describe("interval", () => {
  it("parses and defaults to 3h", () => {
    expect(parseInterval("12h")).toBe("12h");
    expect(parseInterval("x")).toBe("3h");
  });
  it("12h: 오전은 최저, 오후는 최고 기온", () => {
    const g = regroup(day, 12);
    expect(g.map((s) => s.hour)).toEqual([0, 12]);
    expect(g[0].temp).toBe(4);
    expect(g[1].temp).toBe(17);
    expect(g[0].precip).toBe(4);
    expect(g[0].gust).toBe(9);
    expect(g[0].wind).toBe(8);
    expect(g[0].windDir).toBe(90);
  });
  it("6h groups", () => {
    const g = regroup(day, 6);
    expect(g.map((s) => s.temp)).toEqual([4, 14, 17, 7]);
    expect(slotHead(6, 6)).toBe("6~12시");
  });
});
