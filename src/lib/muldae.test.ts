import { describe, expect, it } from "vitest";
import { lunarDay, muldae } from "./muldae";

describe("muldae", () => {
  it("설날은 음력 1일, 추석은 15일", () => {
    expect(lunarDay("2025-01-29")).toBe(1);
    expect(lunarDay("2026-02-17")).toBe(1);
    expect(lunarDay("2025-10-06")).toBe(15);
    expect(lunarDay("2026-09-25")).toBe(15);
  });
  it("7물때식", () => {
    expect(muldae("2026-02-17")).toBe("7물");
    expect(muldae("2026-02-24")).toBe("조금");
    expect(muldae("2026-02-25")).toBe("무시");
    expect(muldae("2026-02-26")).toBe("1물");
    expect(muldae("2026-09-25")).toBe("6물");
  });
});
