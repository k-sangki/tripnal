import { describe, expect, it } from "vitest";
import { placeLiveDescription } from "@/lib/seo";
import type { Place } from "@/lib/places";
import type { Forecast } from "@/lib/weather/types";

const place = { slug: "x", name: "난지캠핑장", region: "서울 마포구", leisure: "camping", lat: 37.5, lon: 126.9 } as Place;
const day = (date: string, precipSum: number, gustMax: number) => ({ date, tMin: 8.4, tMax: 17.2, precipSum, gustMax, code: 0 });
const fc = (days: ReturnType<typeof day>[]) => ({ days }) as unknown as Forecast;
// 2026-10-28(수) 정오 KST → 이번 주말 10/31~11/1
const now = new Date("2026-10-28T03:00:00Z");

describe("placeLiveDescription", () => {
  it("주말 예보 숫자와 맑은 날 훅", () => {
    const d = placeLiveDescription(place, fc([day("2026-10-31", 0, 6), day("2026-11-01", 0.3, 7)]), now);
    expect(d).toContain("난지캠핑장 이번 주말(10/31~11/1)");
    expect(d).toContain("8~17°, 강수 0mm, 돌풍 7m/s");
    expect(d).toContain("불멍");
  });
  it("비가 많으면 비 훅", () => {
    expect(placeLiveDescription(place, fc([day("2026-10-31", 12, 6)]), now)).toContain("우중 캠핑");
  });
  it("예보가 없으면 기본 문장", () => {
    expect(placeLiveDescription(place, null, now)).toContain("3시간 간격");
  });
});
