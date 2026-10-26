import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLACE_TEXT } from "@/data/places-i18n";
import { WORDS } from "./i18n-words";
import { languageAlternates, localePath, tr } from "./i18n";
import { INTERVALS, slotHead } from "./interval";
import { METRIC_LABEL } from "./leisure";
import { PRESETS, periodLabel } from "./period";
import { getPlace } from "./places";
import { foreignTitle } from "./seo-foreign";
import { shortDate } from "./time";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("i18n", () => {
  it("한국어는 그대로", () => {
    expect(tr("ko", "맑음")).toBe("맑음");
    expect(tr("en", "맑음")).toBe("Clear");
    expect(tr("ja", "없는 말")).toBe("없는 말");
    expect(tr("zh", "맑음")).toBe("晴");
  });

  it("사전의 모든 말에 영어·일본어·중국어가 있다", () => {
    for (const [k, v] of Object.entries(WORDS)) expect(v.en && v.ja && v.zh, k).toBeTruthy();
  });

  it("화면에서 t(\"…\")로 부르는 글자는 모두 사전에 있다", () => {
    const missing = new Set<string>();
    for (const f of files("src/components")) {
      for (const m of readFileSync(f, "utf8").matchAll(/\bt\("((?:[^"\\]|\\.)*)"\)/g)) {
        const key = JSON.parse(`"${m[1]}"`);
        if (!WORDS[key]) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("표 항목·기간·간격 이름도 사전에 있다", () => {
    const keys = [...Object.values(METRIC_LABEL), ...PRESETS.map((p) => p.label), ...INTERVALS.flatMap((i) => [i.label, i.long])];
    expect(keys.filter((k) => !WORDS[k] && !/^\d+h$/.test(k))).toEqual([]);
  });

  it("날짜·시각 표기", () => {
    expect(shortDate("2026-10-31", "en")).toBe("Sat, Oct 31");
    expect(shortDate("2026-10-31", "ja")).toBe("10/31(土)");
    expect(shortDate("2026-10-31")).toBe("10/31(토)");
    expect(periodLabel({ from: "2026-10-31", to: "2026-11-01" }, "ja")).toBe("10/31(土)〜11/1(日)・1泊2日");
    expect(slotHead(15, 3, "en")).toBe("3pm");
    expect(slotHead(0, 6, "en")).toBe("12am–6am");
    expect(slotHead(15, 3, "ja")).toBe("15時");
    expect(slotHead(15, 3)).toBe("15시");
    expect(shortDate("2026-10-31", "zh")).toBe("10/31(六)");
    expect(periodLabel({ from: "2026-10-31", to: "2026-11-01" }, "zh")).toBe("10/31(六)～11/1(日)・2天1夜");
  });

  it("hreflang 주소", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("ja", "/weather/seoul")).toBe("/ja/weather/seoul");
    expect(languageAlternates("/weather/seoul")).toEqual({
      ko: "/weather/seoul",
      en: "/en/weather/seoul",
      ja: "/ja/weather/seoul",
      "zh-Hant": "/zh/weather/seoul",
      "x-default": "/en/weather/seoul",
    });
  });

  it("외국어 장소는 모두 실제 장소이고, 검색 제목에 16日을 쓰지 않는다", () => {
    for (const [slug, t] of Object.entries(PLACE_TEXT)) {
      const p = getPlace(slug);
      expect(p, slug).toBeTruthy();
      expect(foreignTitle(p!, t.en, "en")).toMatch(/Weather/);
      const ja = foreignTitle(p!, t.ja, "ja");
      expect(ja).toMatch(/天気/);
      expect(ja).not.toMatch(/16日/);
      expect(foreignTitle(p!, t.zh, "zh")).toMatch(/天氣/);
      // 번체 중국어에 간체·일본식 글자가 섞이지 않게
      expect(`${t.zh.name}${t.zh.region}${t.zh.about}`, slug).not.toMatch(/[国气湾岛乐园东韩庆罗庆尔丽济]/);
    }
  });
});
