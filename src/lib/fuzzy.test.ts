import { describe, expect, it } from "vitest";
import { DESTINATIONS } from "./overseas";
import { matchScore } from "./fuzzy";

const find = (q: string) =>
  DESTINATIONS.map((d) => ({ d, s: matchScore(q, [d.name, d.en, d.country, ...(d.aliases ?? [])]) }))
    .filter((x) => x.s != null)
    .sort((a, b) => a.s! - b.s!)
    .map((x) => x.d.slug);

describe("해외 여행지 느슨한 검색", () => {
  it.each([
    ["호찌민", "ho-chi-minh"],
    ["푸켓", "phuket"],
    ["마츠야마", "matsuyama"],
    ["다카마츠", "takamatsu"],
    ["쿠알라룸프르", "kuala-lumpur"],
    ["라스베가스", "las-vegas"],
    ["샌프란", "san-francisco"],
    ["베니스", "venice"],
    ["코타키나바루", "kota-kinabalu"],
    ["tokyo", "tokyo"],
    ["ㄷㅋ", "tokyo"],
    ["치앙 마이", "chiang-mai"],
    ["나짱", "nha-trang"],
    ["바르세로나", "barcelona"],
  ])("%s → %s", (q, slug) => {
    expect(find(q)[0]).toBe(slug);
  });
  it("나라 이름으로 찾으면 그 나라 여행지가 나온다", () => {
    expect(find("베트남").length).toBeGreaterThan(5);
  });
  it("엉뚱한 말은 찾지 않는다", () => {
    expect(find("자라섬")).toEqual([]);
  });
});
