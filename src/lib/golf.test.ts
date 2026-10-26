import { describe, expect, it } from "vitest";
import { GOLF_COURSES, activeGolfRegions, coursesIn, golfRegionOf } from "@/lib/golf";
import { PLACES } from "@/lib/places";
import { placeSchemaType, placeTitle } from "@/lib/seo";

describe("golf", () => {
  it("모든 골프장이 시·도에 들어가고 slug가 겹치지 않는다", () => {
    for (const p of GOLF_COURSES) expect(golfRegionOf(p), p.slug).toBeDefined();
    expect(new Set(PLACES.map((p) => p.slug)).size).toBe(PLACES.length);
    const total = activeGolfRegions().reduce((a, r) => a + coursesIn(r).length, 0);
    expect(total).toBe(GOLF_COURSES.length);
  });

  it("제목·구조화 데이터", () => {
    const p = { slug: "x-cc", name: "해변CC", region: "경기 용인시", lat: 37, lon: 127, leisure: "golf" as const };
    expect(placeTitle(p)).toMatch(/^해변CC 날씨 · .*라운딩/);
    expect(placeTitle(p)).not.toMatch(/16일/);
    expect(placeSchemaType(p)).toBe("GolfCourse");
  });
});
