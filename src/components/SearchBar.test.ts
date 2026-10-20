import { describe, expect, it } from "vitest";
import { PLACES } from "@/lib/places";
import { localMatches, merge } from "./SearchBar";

describe("localMatches", () => {
  it("이름이 검색어로 시작하는 장소를 먼저 찾는다", () => {
    const r = localMatches(PLACES, "자라섬");
    expect(r[0].name).toBe("자라섬 오토캠핑장");
  });
  it("띄어쓰기를 무시한다", () => {
    expect(localMatches(PLACES, "자라 섬").length).toBeGreaterThan(0);
  });
  it("최대 4곳", () => {
    expect(localMatches(PLACES, "산").length).toBeLessThanOrEqual(4);
  });
});

describe("merge", () => {
  it("같은 이름이 가까이 있으면 카카오 결과를 뺀다", () => {
    const local = [{ name: "자라섬 오토캠핑장", address: "경기 가평군", lat: 37.818, lon: 127.522 }];
    const remote = [
      { name: "자라섬오토캠핑장", address: "x", lat: 37.82, lon: 127.52 },
      { name: "자라섬", address: "y", lat: 37.81, lon: 127.52 },
    ];
    expect(merge(local, remote).map((r) => r.name)).toEqual(["자라섬 오토캠핑장", "자라섬"]);
  });
});
