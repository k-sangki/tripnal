import { describe, expect, it } from "vitest";
import { nextWeekendDay } from "@/lib/favorites";

describe("nextWeekendDay", () => {
  it("평일이면 다가오는 토요일", () => expect(nextWeekendDay("2026-11-04")).toBe("2026-11-07"));
  it("토요일·일요일이면 그날", () => {
    expect(nextWeekendDay("2026-11-07")).toBe("2026-11-07");
    expect(nextWeekendDay("2026-11-08")).toBe("2026-11-08");
  });
});
