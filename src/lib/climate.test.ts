import { describe, expect, it } from "vitest";
import { clothesFor, climateSummary, getNormals, goodMonths, localMonth, monthGuide, monthRanges } from "@/lib/climate";
import { weatherIssues } from "@/lib/climateIssues";
import { DESTINATIONS, getDestination } from "@/lib/overseas";
import type { Forecast } from "@/lib/weather/types";

describe("climate", () => {
  it("모든 여행지에 12달 평년값이 있다", () => {
    for (const d of DESTINATIONS) expect(getNormals(d.slug)?.length, d.slug).toBe(12);
  });

  it("좋은 달은 2~10달", () => {
    for (const d of DESTINATIONS) {
      const n = goodMonths(d.slug).length;
      expect(n >= 2 && n <= 10, d.slug).toBe(true);
    }
  });

  it("오사카는 봄·가을, 방콕은 건기(11~1월), 삿포로 2월은 눈축제", () => {
    const m = (s: string) => goodMonths(s).map((g) => g.month);
    expect(m("osaka")).toEqual(expect.arrayContaining([4, 5, 10, 11]));
    expect(m("osaka")).not.toContain(8);
    expect(m("bangkok")).toEqual(expect.arrayContaining([12, 1]));
    expect(goodMonths("sapporo").find((g) => g.month === 2)?.reason).toBe("눈축제");
  });

  it("달 묶음 표기", () => {
    expect(monthRanges([3, 4, 5, 10, 11])).toBe("3~5월, 10~11월");
    expect(monthRanges([11, 12, 1, 2])).toBe("11~2월");
    expect(monthRanges([2, 6, 7])).toBe("2월, 6~7월");
    expect(monthRanges([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("1년 내내");
  });

  it("옷차림·가이드", () => {
    expect(clothesFor(30)).toContain("반팔");
    expect(clothesFor(-10)).toContain("롱패딩");
    const g = monthGuide(getDestination("bangkok")!, 8)!;
    expect(g.packing).toContain("우산");
    expect(g.cautions.join()).toContain("태풍");
    expect(monthGuide(getDestination("cusco")!, 7)!.packing).toContain("고산병 약");
    expect(climateSummary(getDestination("sydney")!).join()).toContain("남반구");
  });

  it("16일 예보에서 평년보다 심한 날씨를 찾는다", () => {
    const day = (date: string, tMax: number, tMin: number, precipSum: number) =>
      ({ date, tMax, tMin, precipSum, gustMax: 5, slots: [] }) as unknown as Forecast["days"][number];
    const f = { days: [day("2026-10-21", 22, 14, 0), day("2026-10-22", 21, 13, 80)] } as Forecast;
    const issues = weatherIssues(getNormals("osaka")!, f);
    expect(issues.map((x) => x.kind)).toEqual(["rain"]);
    expect(issues[0].text).toContain("10/22(목)");
  });

  it("현지 달", () => {
    expect(localMonth(540, new Date("2026-12-31T16:00:00Z"))).toBe(1);
    expect(localMonth(-300, new Date("2027-01-01T03:00:00Z"))).toBe(12);
  });
});
