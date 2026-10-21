import { describe, expect, it } from "vitest";
import { defaultQuery, finderTitle, parseQuery, runFinder, toSearch } from "@/lib/finder";
import { DESTINATIONS, getDestination } from "@/lib/overseas";
import { finderRows, seasons, wetDry } from "@/lib/season";

const rows = finderRows(DESTINATIONS, new Date("2026-10-21T00:00:00Z"));

describe("seasons", () => {
  it("12달 모두 성수기·간절기·비수기 중 하나", () => {
    for (const d of DESTINATIONS) {
      const s = seasons(d);
      if (!s) continue;
      expect(s).toHaveLength(12);
      expect(s.some((x) => x.kind === "peak")).toBe(true);
    }
  });
  it("방콕 우기는 비수기, 우기 끝물은 간절기", () => {
    const s = seasons(getDestination("bangkok")!)!;
    expect(s[7].kind).toBe("off"); // 8월
    expect(s[7].reason).toBe("우기");
    expect(s[9].kind).toBe("shoulder"); // 10월: 11월부터 건기
    expect(s[9].reason).toContain("우기 끝물");
  });
});

describe("finder", () => {
  it("주소 조건을 읽고 다시 쓴다", () => {
    const q = parseQuery(new URLSearchParams("m=9,10,11&s=shoulder,off&g=동남아&f=6&t=hot&tz=1&o=near"), 10);
    expect(q).toEqual({ months: [9, 10, 11], seasons: ["shoulder", "off"], groups: ["동남아"], flight: 6, temp: "hot", nearTz: true, sort: "near" });
    expect(parseQuery(new URLSearchParams(toSearch(q, 10).slice(1)), 10)).toEqual(q);
    expect(toSearch(defaultQuery(10), 10)).toBe("");
  });
  it("여러 달이 맞는 곳이 먼저, 조건 밖은 빠진다", () => {
    const q = { ...defaultQuery(10), months: [9, 10, 11], groups: ["일본"], flight: 3 };
    const res = runFinder(rows, q);
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.row.group === "일본" && r.row.flight <= 3)).toBe(true);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].matched.length).toBeGreaterThanOrEqual(res[i].matched.length);
  });
  it("제목", () => {
    expect(finderTitle({ ...defaultQuery(10), months: [9, 10, 11], groups: ["동남아"] }, 14)).toBe("9~11월에 가기 좋은 동남아 여행지 14곳");
    expect(finderTitle({ ...defaultQuery(10), seasons: ["shoulder"] }, 77)).toBe("10월 해외 간절기 여행지 77곳");
  });
});

describe("finder 제목·주소 추가", () => {
  it("기온 취향이 제목에 들어가고 주소의 쉼표는 그대로", () => {
    const q = { ...defaultQuery(1), months: [12, 1, 2], seasons: ["peak", "shoulder"] as ("peak" | "shoulder")[], temp: "hot" as const };
    expect(finderTitle(q, 41)).toBe("12~2월 더운 해외 여행지 41곳");
    expect(toSearch(q, 1)).toBe("?m=12,1,2&s=peak,shoulder&t=hot");
  });
});

describe("wetDry", () => {
  it("열대 여행지의 우기·건기를 고른다", () => {
    const bkk = wetDry(getDestination("bangkok")!)!;
    expect(bkk.wet).toContain(8);
    expect(bkk.dry).toContain(1);
    expect(wetDry(getDestination("tokyo")!)).toBeNull();
  });
});
