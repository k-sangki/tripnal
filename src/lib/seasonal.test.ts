import { describe, expect, it } from "vitest";
import { FOLIAGE_PEAK, foliageRows, isSnow, kimjangDay, kimjangRows, place, SEASON_CITIES, skiRows, snowRows, type DaysData } from "./seasonal";
import type { WeekendDay } from "./weekend";

function day(date: string, tMin: number, tMax: number, code = 0): WeekendDay {
  return { date, tMin, tMax, rain: 0, prob: 0, wind: 2, gust: 5, code };
}

describe("계절 페이지", () => {
  it("장소 slug가 모두 있다", () => {
    for (const s of [...SEASON_CITIES, ...Object.keys(FOLIAGE_PEAK)]) expect(place(s), s).toBeDefined();
  });

  it("눈 코드", () => {
    expect(isSnow(71)).toBe(true);
    expect(isSnow(86)).toBe(true);
    expect(isSnow(61)).toBe(false);
    expect(isSnow(null)).toBe(false);
  });

  it("첫눈: 지난 날은 빼고, 눈 예보가 빠른 순", () => {
    const data: DaysData = {
      generated: "",
      places: {
        seoul: [day("2026-11-01", -3, 5, 73), day("2026-11-02", 1, 8), day("2026-11-05", -1, 4, 71)],
        busan: [day("2026-11-02", 8, 15), day("2026-11-03", 6, 14)],
        chuncheon: [day("2026-11-02", -4, 6), day("2026-11-03", -2, 3, 75)],
      },
    };
    const rows = snowRows(data, ["seoul", "busan", "chuncheon"], "2026-11-02");
    expect(rows.map((r) => r.place.slug)).toEqual(["chuncheon", "seoul", "busan"]);
    expect(rows[1].snow).toBe("2026-11-05");
    expect(rows[1].freeze).toBe("2026-11-05");
    expect(rows[2].snow).toBeNull();
  });

  it("스키장: 영하 3도 이하 밤 수", () => {
    const data: DaysData = { generated: "", places: { yongpyong: [day("2026-11-10", -5, 2), day("2026-11-11", -3, 1), day("2026-11-12", -2, 4, 71)] } };
    const r = skiRows(data, "2026-11-10").find((x) => x.place.slug === "yongpyong")!;
    expect(r.nights).toBe(2);
    expect(r.firstNight).toBe("2026-11-10");
    expect(r.snow).toBe("2026-11-12");
  });

  it("김장 적기: 평균 4도 이하 + 최저 0도 이하", () => {
    expect(kimjangDay(day("d", -1, 8))).toBe(true);
    expect(kimjangDay(day("d", -1, 10))).toBe(false);
    expect(kimjangDay(day("d", 1, 5))).toBe(false);
    const data: DaysData = { generated: "", places: { seoul: [day("2026-11-20", 2, 9), day("2026-11-21", -2, 7)] } };
    expect(kimjangRows(data, "2026-11-20")[0].first).toBe("2026-11-21");
  });

  it("단풍 상태: 이번 주말 기준 절정 앞뒤", () => {
    const rows = foliageRows("2026-10-31");
    const s = (slug: string) => rows.find((r) => r.place.slug === slug)!.status;
    expect(s("seoraksan-daecheongbong")).toBe("past"); // 10-17, 2주 지남
    expect(s("bukhansan-baegundae")).toBe("peak"); // 10-28
    expect(s("naejangsan")).toBe("peak"); // 11-04
    expect(s("dalmasan-duryunsan")).toBe("soon"); // 11-10
    expect(foliageRows("2026-12-05")[0].peak).toBe("2027-10-15");
    expect(foliageRows("2026-07-01").every((r) => r.status === "later")).toBe(true);
  });
});
