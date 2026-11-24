import { describe, expect, it } from "vitest";
import { MOUNTAIN_GUIDE } from "@/data/mountain-intro";
import { mountainMonths, sunriseKst, wearFor } from "./mountainMonths";

const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;

describe("mountainMonths", () => {
  it("서울 해수면 일출은 천문연 값과 1~2분 안", () => {
    expect(hm(sunriseKst(37.5665, 126.978, 0, 2026, 1, 15))).toBe("7:46");
    expect(hm(sunriseKst(37.5665, 126.978, 0, 2026, 6, 15))).toBe("5:10");
  });
  it("높은 정상은 지평선이 내려가 일출이 더 이르다", () => {
    expect(sunriseKst(35.3369, 127.7306, 1915, 2026, 1, 15)).toBeLessThan(sunriseKst(35.3369, 127.7306, 0, 2026, 1, 15) - 5);
  });
  it("천왕봉 12달 표", () => {
    const rows = mountainMonths("jirisan-cheonwangbong", 35.3369, 127.7306, 1915)!;
    expect(rows).toHaveLength(12);
    expect(rows[0].wear).toContain("패딩");
    expect(rows[0].wear).toContain("아이젠");
    expect(rows[7].wear).not.toContain("아이젠");
  });
  it("옷차림 단계", () => {
    expect(wearFor(15, 25)).toContain("반팔");
    expect(wearFor(0, 8)).toContain("플리스");
  });
  it("길잡이 글은 장마다 비어 있지 않다", () => {
    for (const secs of Object.values(MOUNTAIN_GUIDE)) for (const s of secs) expect(s.p.length).toBeGreaterThan(100);
  });
});
