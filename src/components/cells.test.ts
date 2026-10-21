import { describe, expect, it } from "vitest";
import { rainClass } from "./cells";

describe("rainClass", () => {
  it("확률이 높거나 없으면 양으로만 칠한다", () => {
    expect(rainClass(1.2, 70)).toBe("r2");
    expect(rainClass(6, null)).toBe("r3");
  });
  it("확률 20% 미만은 회색", () => {
    expect(rainClass(1.2, 10)).toBe("r-low");
    expect(rainClass(0.3, 5)).toBe("r-low");
  });
  it("확률 20~40%는 한 단계 연하게 (가장 연한 단계 아래로는 안 내려감)", () => {
    expect(rainClass(6, 30)).toBe("r2");
    expect(rainClass(0.5, 25)).toBe("r1");
  });
});
