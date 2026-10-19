import { describe, expect, it } from "vitest";
import { scoreDay } from "./leisure";
import type { DayForecast } from "./weather/types";

const day = (o: Partial<DayForecast> = {}): DayForecast => ({
  date: "2026-10-24",
  slots: [],
  tMin: 10,
  tMax: 20,
  precipSum: 0,
  precipProbMax: 10,
  windMax: 3,
  gustMax: 5,
  code: 1,
  sunrise: "06:40",
  sunset: "17:50",
  ...o,
});

describe("scoreDay", () => {
  it("맑고 잔잔하면 모든 레저가 좋음", () => {
    for (const id of ["camping", "fishing", "hiking", "cycling", "travel"] as const) {
      expect(scoreDay(day(), id).grade).toBe("good");
    }
  });
  it("강풍은 낚시에 나쁨, 이유를 알려준다", () => {
    const s = scoreDay(day({ windMax: 11, gustMax: 15 }), "fishing");
    expect(s.grade).toBe("bad");
    expect(s.reasons).toContain("바람 11m/s");
  });
  it("약한 비도 사이클에는 감점이 크다", () => {
    expect(scoreDay(day({ precipSum: 1 }), "cycling").grade).toBe("fair");
    expect(scoreDay(day({ precipSum: 1 }), "travel").grade).toBe("good");
  });
});
