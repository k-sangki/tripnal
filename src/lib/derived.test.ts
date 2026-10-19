import { describe, expect, it } from "vitest";
import { iceRisk, pmLevel, roadState, thunderLevel, turbulence } from "./derived";
import type { Slot } from "./weather/types";

const s = (o: Partial<Slot>): Slot => ({
  time: "2026-10-20T12:00",
  hour: 12,
  temp: 10,
  feels: 9,
  precip: 0,
  precipProb: 0,
  cloud: 0,
  wind: 2,
  gust: 3,
  windDir: 0,
  code: 0,
  isDay: true,
  snow: 0,
  visibility: 20,
  uv: 3,
  cape: 0,
  wave: null,
  windWave: null,
  tide: null,
  pm10: null,
  pm25: null,
  ...o,
});

describe("derived", () => {
  it("뇌우 코드는 낙뢰 높음", () => {
    expect(thunderLevel(s({ code: 95 })).text).toBe("높음");
    expect(thunderLevel(s({ cape: 800 })).text).toBe("낮음");
  });
  it("영하에 비가 오면 빙판", () => {
    expect(roadState(s({ temp: -1, precip: 0.5 })).text).toBe("빙판");
    expect(roadState(s({ precip: 1 })).text).toBe("젖음");
    expect(roadState(s({})).text).toBe("건조");
    expect(iceRisk(s({ temp: -4 })).level).toBe(3);
  });
  it("돌풍 차이가 크면 기류가 거칠다", () => {
    expect(turbulence(s({ wind: 3, gust: 11 })).text).toBe("거침");
    expect(turbulence(s({ wind: 2, gust: 3 })).text).toBe("안정");
  });
  it("미세먼지 단계", () => {
    expect(pmLevel(25, "pm10")).toBe(0);
    expect(pmLevel(40, "pm25")).toBe(2);
  });
});
