import { describe, expect, it } from "vitest";
import { apparent, corners, expand, hourKeys, loadCollected, loadWave, pointKey, uvIndex, weatherCode, type DataBucket, type PointFile } from "./collected";

// 2026-10-20 00:00 KST = 2026-10-19 15:00 UTC
const NOW = new Date("2026-10-20T03:00:00+09:00");

function point(over: Partial<PointFile> = {}): PointFile {
  return {
    model: "test",
    run: "2026101915",
    lat: 37.5,
    lon: 127,
    elevation: 100,
    step: [0, 3, 9],
    temp: [10, 13, 7],
    dew: [5, 5, 5],
    wind: [2, 2, 2],
    dir: [350, 10, 10],
    gust: [null, 6, 9],
    precip: [0, 3, 6],
    snow: [0, 0, 0],
    cloud: [0, 50, 100],
    cape: [0, 0, 0],
    ...over,
  };
}

describe("직접 수집 예보", () => {
  it("순간값은 직선으로 잇고 강수는 구간을 시간당으로 나눈다", () => {
    const keys = hourKeys(NOW).slice(0, 10);
    const h = expand(point(), keys);
    expect(keys[0]).toBe("2026-10-20T00:00");
    expect(h.temp.slice(0, 4)).toEqual([10, 11, 12, 13]);
    expect(h.temp[6]).toBeCloseTo(10);
    expect(h.precip.slice(0, 5)).toEqual([null, 1, 1, 1, 1]);
    expect(h.gust[5]).toBe(9);
    // 350°→10° 사이 북풍이 남풍으로 뒤집히지 않는다
    expect(h.v[1]).toBeLessThan(-1.9);
    expect(h.temp[9]).toBe(7);
  });

  it("격자 네 점 가중치 합은 1", () => {
    const cs = corners(37.6, 127.1);
    expect(cs.reduce((a, c) => a + c.w, 0)).toBeCloseTo(1);
    expect(cs[0]).toMatchObject({ lat: 37.5, lon: 127 });
    expect(pointKey("gfs", "2026101912", cs[3].lat, cs[3].lon)).toBe("gfs/2026101912/37.75_127.25.json");
  });

  it("날씨 코드: 뇌우는 두 모델 이상, 눈, 소나기, 구름", () => {
    expect(weatherCode(3, 0, 100, 1500, null, 1)).toBe(81);
    expect(weatherCode(3, 0, 100, 1500, null, 2)).toBe(95);
    expect(weatherCode(1, 1, 100, 0, null, 0)).toBe(73);
    expect(weatherCode(1, 0, 100, 0, null, 0)).toBe(61);
    expect(weatherCode(0, 0, 10, 0, null, 0)).toBe(0);
    expect(weatherCode(0, 0, 90, 0, 500, 0)).toBe(45);
  });

  it("체감온도·자외선", () => {
    expect(apparent(30, 25, 1)!).toBeGreaterThan(30);
    expect(apparent(0, -5, 8)!).toBeLessThan(-5);
    expect(uvIndex("2026-10-20T00:00", 37.5, 127, 0)).toBe(0);
    const noon = uvIndex("2026-10-20T12:00", 37.5, 127, 0)!;
    expect(noon).toBeGreaterThan(3);
    expect(uvIndex("2026-10-20T12:00", 37.5, 127, 100)!).toBeLessThan(noon);
  });

  it("세 모델 중간값으로 묶고 지점 고도로 기온을 보정한다", async () => {
    const files: Record<string, unknown> = {};
    const temps = { ecmwf: 10, gfs: 12, icon: 20 };
    for (const [m, t] of Object.entries(temps)) {
      files[`${m}/latest.json`] = { run: "2026101915" };
      for (const c of corners(37.6, 127.1)) {
        files[pointKey(m as "gfs", "2026101915", c.lat, c.lon)] = point({ temp: [t, t, t], elevation: 100 });
      }
    }
    const ranges: number[] = [];
    const bucket: DataBucket = {
      async get(key, options) {
        if (key === "dem/korea.bin") {
          ranges.push(options!.range.offset);
          const buf = new ArrayBuffer(2);
          new DataView(buf).setInt16(0, 600, true);
          return { json: async () => null as never, arrayBuffer: async () => buf };
        }
        const v = files[key];
        return v ? { json: async <T,>() => v as T, arrayBuffer: async () => new ArrayBuffer(0) } : null;
      },
    };
    const raw = await loadCollected(bucket, 37.6, 127.1, 1100, NOW);
    // 중간값 12°에서 1000m 높으니 6.5° 내려간다
    expect(raw.hourly.temperature[0]).toBe(5.5);
    expect(raw.elevation).toBe(1100);
    expect(raw.source).toBe("ECMWF·GFS·ICON");
    expect(raw.hourly.time).toHaveLength(16 * 24);
    expect(raw.hourly.precipitation[2]).toBe(1);
    expect(ranges).toHaveLength(0);

    // 고도를 모르면 지형 격자 값(600m)으로 보정한다: 12 - 500×0.0065
    const auto = await loadCollected(bucket, 37.6, 127.1, undefined, NOW);
    expect(auto.elevation).toBe(600);
    expect(auto.hourly.temperature[0]).toBe(8.8);
    // 북위 37.6° = 39.5에서 1.9° 아래 → 456행, 동경 127.1° → 744열
    expect(ranges).toEqual([(456 * 1920 + 744) * 2]);
  });

  it("파고는 바다인 격자점만 섞고, 모두 육지면 없다", async () => {
    const cs = corners(36.3, 126.4);
    const files: Record<string, unknown> = {
      "wave/latest.json": { run: "2026101915" },
      "wave/2026101915/sea.json": ["36.25_126.25"],
      "wave/2026101915/36.25_126.25.json": { run: "2026101915", step: [0, 3], wave: [1, 2], windwave: [0.5, 0.5], period: [5, 5] },
    };
    const bucket: DataBucket = {
      async get(key) {
        const v = files[key];
        return v ? { json: async <T,>() => v as T, arrayBuffer: async () => new ArrayBuffer(0) } : null;
      },
    };
    const keys = hourKeys(NOW).slice(0, 4);
    const w = await loadWave(bucket, cs, keys);
    expect(w?.waveHeight).toEqual([1, 1.3, 1.7, 2]);
    expect(await loadWave(bucket, corners(37.6, 127.1), keys)).toBeNull();
  });
});
