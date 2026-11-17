import { describe, expect, it } from "vitest";
import { applyTempCorrection, calibrateProb, stationWeights, tempCorrection, type TempCalib } from "./calibrate";

const calib: TempCalib = {
  generated: "2026-11-17T09:00+00:00",
  stations: { a: [37.5, 127.0, 50], b: [37.5, 127.5, 50], m: [37.5, 127.2, 900] },
  temp: { ecmwf: { a: [1, 1, 1, 1, 1, 1, 1, 1], b: [-1, -1, -1, -1, -1, -1, -1, -1], m: [2, 2, 2, 2, 2, 2, 2, 2] } },
};
const now = new Date("2026-11-17T00:00:00Z");

describe("calibrateProb", () => {
  it("확률을 절반쯤 낮춘다", () => {
    expect(calibrateProb(0)).toBe(0);
    expect(calibrateProb(20)).toBe(20);
    expect(calibrateProb(50)).toBe(41);
    expect(calibrateProb(55)).toBe(45);
    expect(calibrateProb(100)).toBe(94);
    expect(calibrateProb(null)).toBeNull();
  });
});

describe("기온 보정", () => {
  it("가까운 관측소 값이 거의 그대로 쓰인다", () => {
    const w = stationWeights(calib, 37.5, 127.0, 50);
    const corr = tempCorrection(calib, "ecmwf", w, ["2026-11-17T12:00"], now)!;
    expect(corr[0]).toBeGreaterThan(0.95);
  });
  it("고도 차가 크면 그 관측소는 빠지고 보정이 줄어든다", () => {
    const w = stationWeights(calib, 37.5, 127.2, 50);
    expect(w.find((s) => s.sid === "m")).toBeUndefined();
    const total = w.reduce((a, s) => a + s.w, 0);
    expect(total).toBeLessThan(1);
  });
  it("80km 밖이면 보정 없음", () => {
    expect(tempCorrection(calib, "ecmwf", stationWeights(calib, 35, 129, 50), ["2026-11-17T12:00"], now)).toBeNull();
  });
  it("멀리 가는 예보일수록 줄어 10일 뒤엔 0", () => {
    const w = stationWeights(calib, 37.5, 127.0, 50);
    const [d1, d7, d11] = tempCorrection(calib, "ecmwf", w, ["2026-11-18T12:00", "2026-11-24T09:00", "2026-11-28T12:00"], now)!;
    expect(d1).toBeGreaterThan(0.95);
    expect(d7).toBeGreaterThan(0.3);
    expect(d7).toBeLessThan(0.8);
    expect(d11).toBe(0);
  });
  it("모델 기록이 없으면 null", () => {
    expect(tempCorrection(calib, "gfs", stationWeights(calib, 37.5, 127.0, 50), ["2026-11-17T12:00"], now)).toBeNull();
  });
  it("시각 사이는 직선, 21시와 0시 사이도 이어진다", () => {
    const c: TempCalib = { ...calib, temp: { ecmwf: { a: [0, 0, 0, 0, 0, 0, 0, 3] } } };
    const w = [{ sid: "a", w: 1 }];
    const [h22, h23, h0] = tempCorrection(c, "ecmwf", w, ["2026-11-17T22:00", "2026-11-17T23:00", "2026-11-18T00:00"], now)!;
    expect(h22).toBeCloseTo(2);
    expect(h23).toBeCloseTo(1);
    expect(h0).toBeCloseTo(0);
  });
  it("이슬점은 고친 기온을 넘지 않는다", () => {
    const m = applyTempCorrection({ temp: [10, null], dew: [9.5, 3] }, [1, 1]);
    expect(m.temp).toEqual([9, null]);
    expect(m.dew).toEqual([9, 3]);
  });
});
