import { describe, expect, it } from "vitest";
import { DESTINATIONS, findDestination } from "./overseas";
import { kstDate, tzOffsetMin } from "./time";
import { corners, hourKeys } from "./weather/collected";

describe("overseas", () => {
  it("여행지 slug는 겹치지 않고 시간대가 올바르다", () => {
    expect(new Set(DESTINATIONS.map((d) => d.slug)).size).toBe(DESTINATIONS.length);
    for (const d of DESTINATIONS) expect(() => tzOffsetMin(d.tz)).not.toThrow();
  });
  it("서머타임을 반영한 현지 시간대", () => {
    expect(tzOffsetMin("Asia/Tokyo", new Date("2026-10-20T00:00:00Z"))).toBe(540);
    expect(tzOffsetMin("Europe/Paris", new Date("2026-07-01T00:00:00Z"))).toBe(120);
    expect(tzOffsetMin("Europe/Paris", new Date("2026-12-01T00:00:00Z"))).toBe(60);
    expect(tzOffsetMin("Pacific/Honolulu", new Date("2026-10-20T00:00:00Z"))).toBe(-600);
  });
  it("현지 날짜: 한국 10/21 새벽이면 호놀룰루는 10/20", () => {
    const t = new Date("2026-10-20T18:00:00Z");
    expect(kstDate(t)).toBe("2026-10-21");
    expect(kstDate(t, -600)).toBe("2026-10-20");
    expect(hourKeys(t, -600)[0]).toBe("2026-10-20T00:00");
  });
  it("해외 좌표는 전 지구 격자의 둘레 네 점 (경도 0 근처도 0.00)", () => {
    const cs = corners(51.5072, -0.1276);
    expect(cs.map((c) => `${c.lat.toFixed(2)}_${c.lon.toFixed(2)}`)).toEqual(["51.50_-0.25", "51.50_0.00", "51.75_-0.25", "51.75_0.00"]);
    expect(cs.reduce((a, c) => a + c.w, 0)).toBeCloseTo(1);
  });
  it("예보 API는 목록 좌표만 해외로 받는다", () => {
    expect(findDestination(35.6812, 139.7671)?.slug).toBe("tokyo");
    expect(findDestination(35.7, 139.8)).toBeUndefined();
  });
});
