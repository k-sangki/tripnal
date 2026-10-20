import { describe, expect, it } from "vitest";
import { apparent, corners, expand, hourKeys, loadAirQuality, loadCollected, loadProbability, loadTide, loadWave, pointKey, uvIndex, weatherCode, type DataBucket, type PointFile } from "./collected";

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
    // 격자선 위 해안 지점: 바다 점 가중치가 0이어도 값을 낸다
    const coast = await loadWave(bucket, corners(36.0, 126.25), keys);
    expect(coast?.waveHeight[0]).toBe(1);
  });

  it("강수 확률은 그 시각이 속한 6시간 구간 값", async () => {
    const files: Record<string, unknown> = { "gefs/latest.json": { run: "2026101915" } };
    for (const c of corners(37.5, 127)) {
      files[`gefs/2026101915/${c.lat.toFixed(2)}_${c.lon.toFixed(2)}.json`] = { run: "2026101915", step: [6, 12], prob: [40, 80] };
    }
    const bucket: DataBucket = {
      async get(key) {
        const v = files[key];
        return v ? { json: async <T,>() => v as T, arrayBuffer: async () => new ArrayBuffer(0) } : null;
      },
    };
    const p = await loadProbability(bucket, corners(37.5, 127), hourKeys(NOW).slice(0, 14));
    // 0시 = run 기준 0시간(구간 밖), 1~6시 = 40%, 7~12시 = 80%, 13시부터 없음
    expect(p).toEqual([null, 40, 40, 40, 40, 40, 40, 80, 80, 80, 80, 80, 80, null]);
  });

  it("만조·간조는 가까운 관측소 예보, 사이 높이는 코사인으로 잇는다", async () => {
    const files: Record<string, unknown> = {
      "tide/stations.json": [
        { code: "DT_0001", name: "인천", lat: 37.45194, lon: 126.59222 },
        { code: "DT_0004", name: "제주", lat: 33.5275, lon: 126.54305 },
      ],
      "tide/DT_0001.json": {
        code: "DT_0001",
        name: "인천",
        lat: 37.45194,
        lon: 126.59222,
        msl: 400,
        events: [
          ["2026-10-19 23:00", "L", 300],
          ["2026-10-20 05:00", "H", 600],
          ["2026-10-20 11:00", "L", 200],
        ],
      },
    };
    const bucket: DataBucket = {
      async get(key) {
        const v = files[key];
        return v ? { json: async <T,>() => v as T, arrayBuffer: async () => new ArrayBuffer(0) } : null;
      },
    };
    const keys = hourKeys(NOW).slice(0, 13);
    const t = await loadTide(bucket, 37.45, 126.6, keys, true);
    expect(t?.station).toBe("인천");
    // 어제 이벤트는 보간에만 쓴다
    expect(t?.tideEvents).toEqual([
      { at: "2026-10-20 05:00", type: "high", level: 2 },
      { at: "2026-10-20 11:00", type: "low", level: -2 },
    ]);
    // 23시 -1m → 5시 +2m: 2시(가운데)는 0.5m, 5시 2m, 8시 0m, 11시 -2m, 12시는 다음 이벤트가 없어 없음
    expect(t?.seaLevel[2]).toBe(0.5);
    expect(t?.seaLevel[5]).toBe(2);
    expect(t?.seaLevel[8]).toBe(0);
    expect(t?.seaLevel[11]).toBe(-2);
    expect(t?.seaLevel[12]).toBeNull();
    // 내륙(바다 격자 없음)은 아주 가까운 관측소만, 먼 곳은 없음
    expect(await loadTide(bucket, 37.5, 126.75, keys, false)).toBeNull();
    expect(await loadTide(bucket, 36.0, 127.5, keys, true)).toBeNull();
  });

  it("미세먼지는 네 점 값을 시각별로 잇는다", async () => {
    const files: Record<string, unknown> = { "cams/latest.json": { run: "2026101912" } };
    for (const c of corners(37.5, 127)) {
      files[`cams/2026101912/${c.lat.toFixed(2)}_${c.lon.toFixed(2)}.json`] = { run: "2026101912", step: [3, 6], pm10: [30, 60], pm25: [10, null] };
    }
    const bucket: DataBucket = {
      async get(key) {
        const v = files[key];
        return v ? { json: async <T,>() => v as T, arrayBuffer: async () => new ArrayBuffer(0) } : null;
      },
    };
    // 0시 KST = run 기준 3시간
    const q = await loadAirQuality(bucket, corners(37.5, 127), hourKeys(NOW).slice(0, 5));
    expect(q?.pm10).toEqual([30, 40, 50, 60, null]);
    expect(q?.pm25).toEqual([10, null, null, null, null]);
  });
});
