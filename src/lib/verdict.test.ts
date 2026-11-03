import { describe, expect, it } from "vitest";
import { dayVerdict, stripEmoji, type VerdictDay } from "@/lib/verdict";

const day = (o: Partial<VerdictDay>): VerdictDay => ({ code: 0, rain: 0, prob: 10, gust: 5, tMin: 8, tMax: 18, wave: null, ...o });

describe("dayVerdict", () => {
  it("맑고 잔잔하면 가도 됨", () => {
    const v = dayVerdict(day({}), "camping", "camp");
    expect(v.level).toBe("go");
    expect(v.title).toContain("불멍");
  });
  it("캠핑은 살짝 영하면 가도 되지만 침낭 안내", () => {
    const v = dayVerdict(day({ tMin: -2, tMax: 6 }), "camping", "camp");
    expect(v.level).toBe("go");
    expect(v.sub).toContain("침낭");
  });
  it("비가 많이 오면 쉬라고 한다", () => {
    expect(dayVerdict(day({ rain: 14, prob: 90 }), "hiking", "active").level).toBe("stop");
  });
  it("낚시는 같은 바람에 더 민감하다", () => {
    const d = day({ gust: 10 });
    expect(dayVerdict(d, "fishing", "marine").level).toBe("meh");
    expect(dayVerdict(d, "hiking", "active").level).toBe("go");
  });
  it("파고 2m 넘으면 바다는 쉰다", () => {
    expect(dayVerdict(day({ wave: 2.1 }), "fishing", "marine").level).toBe("stop");
  });
  it("스키는 눈 오고 추워도 괜찮다", () => {
    expect(dayVerdict(day({ code: 73, rain: 8, prob: 90, tMin: -12, tMax: -4 }), "ski", "snow").level).toBe("go");
  });
  it("근거 숫자 칩을 늘 붙인다", () => {
    const v = dayVerdict(day({ rain: 2 }), "travel", "outdoor");
    expect(v.level).toBe("meh");
    expect(v.chips.some((c) => c.text.includes("비 2mm") && c.bad)).toBe(true);
  });
});

describe("stripEmoji", () => {
  it("그림 글자만 뗀다", () => {
    expect(stripEmoji("텐트 쳐도 됨, 불멍 각 🔥")).toBe("텐트 쳐도 됨, 불멍 각");
    expect(stripEmoji("☔ 비 2mm")).toBe("비 2mm");
  });
});
