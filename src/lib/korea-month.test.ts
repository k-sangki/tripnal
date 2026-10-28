import { describe, expect, it } from "vitest";
import { KOREA_MONTH_CITIES, clothes, countryMonthDescription, countryMonthTitle, krNormals, monthDescription, monthTitle, parseMonth } from "./korea-month";

describe("국내 도시 월별 날씨", () => {
  it("10개 도시 12달 평년값", () => {
    expect(KOREA_MONTH_CITIES.length).toBe(10);
    for (const s of KOREA_MONTH_CITIES) {
      const n = krNormals(s)!;
      expect(n).toHaveLength(12);
      // 한국은 8월이 1월보다 덥다
      expect(n[7].hi).toBeGreaterThan(n[0].hi + 15);
    }
  });

  it("달 주소", () => {
    expect(parseMonth("11")).toBe(11);
    expect(parseMonth("0")).toBeNull();
    expect(parseMonth("13")).toBeNull();
    expect(parseMonth("011")).toBeNull();
  });

  it("검색 제목: 필수 검색어로 시작하고 16일을 쓰지 않는다", () => {
    const n = krNormals("seoul")![10];
    expect(monthTitle("서울", 11, n, "ko")).toMatch(/^서울 11월 날씨 · /);
    expect(monthTitle("Seoul", 11, n, "en")).toMatch(/^Seoul Weather in November · What to Wear/);
    expect(monthTitle("ソウル", 11, n, "ja")).toMatch(/^ソウル 11月の気温・天気と服装｜/);
    expect(monthTitle("首爾", 1, krNormals("seoul")![0], "zh")).toBe("首爾1月天氣與穿搭・比台北冷18℃？");
    for (const l of ["ko", "ja"] as const) {
      expect(monthTitle("서울", 11, n, l) + monthDescription("서울", 11, n, l)).not.toMatch(/16일|16日/);
    }
  });

  it("옷차림", () => {
    expect(clothes(-8, "en")).toMatch(/parka/);
    expect(clothes(30, "ja")).toMatch(/半袖/);
    expect(clothes(10, "ko")).toBe("트렌치코트, 야상, 니트");
  });

  it("한국 전체 월별 제목", () => {
    expect(countryMonthTitle(11, "ja")).toMatch(/^韓国 11月の気温と服装・ソウルは東京より\d+℃寒い？$/);
    expect(countryMonthTitle(1, "zh")).toMatch(/^韓國1月氣溫與穿搭・首爾比台北冷\d+℃？$/);
    expect(countryMonthTitle(8, "en")).toMatch(/^Korea Weather in August/);
    expect(countryMonthDescription(11, "ja")).toMatch(/ソウル/);
  });
});
