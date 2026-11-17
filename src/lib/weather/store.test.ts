import { describe, expect, it, vi } from "vitest";
import { storedForecast } from "@/lib/weather";
import type { Forecast } from "@/lib/weather/types";

const fc = { days: [] } as unknown as Forecast;

function memBucket() {
  const m = new Map<string, string>();
  return {
    m,
    get: async (k: string) => (m.has(k) ? { json: async <T,>() => JSON.parse(m.get(k)!) as T } : null),
    put: async (k: string, v: string) => void m.set(k, v),
  };
}

describe("storedForecast", () => {
  it("처음엔 계산해서 넣고, 다음엔 꺼내 쓴다", async () => {
    const b = memBucket();
    const compute = vi.fn(async () => fc);
    expect(await storedForecast("k", compute, b)).toEqual(fc);
    expect(await storedForecast("k", compute, b)).toEqual(fc);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(b.m.has("k")).toBe(true);
  });
  it("버킷이 없거나 고장 나도 예보는 계산한다", async () => {
    const compute = vi.fn(async () => fc);
    expect(await storedForecast("k", compute, null)).toEqual(fc);
    const broken = { get: async () => { throw new Error("x"); }, put: async () => { throw new Error("y"); } };
    expect(await storedForecast("k", compute, broken)).toEqual(fc);
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
