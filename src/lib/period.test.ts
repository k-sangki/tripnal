import { describe, expect, it } from "vitest";
import { clampPeriod, inPeriod, periodNights, presetPeriod } from "./period";

describe("period", () => {
  it("이번 주말: 평일이면 다가오는 토·일", () => {
    expect(presetPeriod("weekend", "2026-10-19")).toEqual({ from: "2026-10-24", to: "2026-10-25" }); // 월요일
  });
  it("이번 주말: 토요일이면 오늘·내일, 일요일이면 오늘", () => {
    expect(presetPeriod("weekend", "2026-10-24")).toEqual({ from: "2026-10-24", to: "2026-10-25" });
    expect(presetPeriod("weekend", "2026-10-25")).toEqual({ from: "2026-10-25", to: "2026-10-25" });
  });
  it("16일 전체는 오늘 포함 16일", () => {
    expect(presetPeriod("16d", "2026-10-19")).toEqual({ from: "2026-10-19", to: "2026-11-03" });
  });
  it("범위를 벗어나거나 뒤집힌 기간을 바로잡는다", () => {
    expect(clampPeriod("2026-10-01", "2026-12-01", "2026-10-19")).toEqual({ from: "2026-10-19", to: "2026-11-03" });
    expect(clampPeriod("2026-10-22", "2026-10-20", "2026-10-19")).toEqual({ from: "2026-10-20", to: "2026-10-22" });
    expect(clampPeriod("bad", null, "2026-10-19")).toEqual({ from: "2026-10-19", to: "2026-11-03" });
  });
  it("2박 3일 계산과 포함 여부", () => {
    const p = { from: "2026-10-19", to: "2026-10-21" };
    expect(periodNights(p)).toEqual({ days: 3, nights: 2 });
    expect(inPeriod("2026-10-21", p)).toBe(true);
    expect(inPeriod("2026-10-22", p)).toBe(false);
  });
});

import { topic } from "./seo";
describe("topic", () => {
  it("받침에 맞는 조사", () => {
    expect(topic("대청봉")).toBe("대청봉은");
    expect(topic("자라섬 오토캠핑장")).toBe("자라섬 오토캠핑장은");
    expect(topic("태안")).toBe("태안은");
    expect(topic("서귀포")).toBe("서귀포는");
  });
});
