import { describe, expect, it } from "vitest";
import { changeText } from "./change";

const c = (o: Partial<{ tMax: number; tMin: number; precip: number; precipBefore: number }>) => ({ tMax: 0, tMin: 0, precip: 0, precipBefore: 0, ...o });

describe("예보 변화 문구", () => {
  it("비가 생기거나 사라진 것을 먼저 알린다", () => {
    expect(changeText(c({ precipBefore: 0, precip: 8, tMax: -4 }))?.text).toBe("비 생김");
    expect(changeText(c({ precipBefore: 6, precip: -6 }))?.text).toBe("비 사라짐");
    expect(changeText(c({ precipBefore: 10, precip: 7 }))?.text).toBe("비 +7mm");
  });
  it("비가 비슷하면 더 크게 바뀐 기온", () => {
    expect(changeText(c({ tMax: 1, tMin: -3.2 }))?.text).toBe("최저 −3°");
    expect(changeText(c({ tMax: 2.4 }))?.text).toBe("최고 +2°");
    expect(changeText(c({ tMax: 1, precip: 2, precipBefore: 3 }))?.text).toBe("비슷");
    expect(changeText(null)).toBeNull();
  });
});
