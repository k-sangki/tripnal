import { getPosition } from "suncalc";
import { addDays, kstDate } from "@/lib/time";
import type { HourlySeries, RawForecast, WeatherProvider } from "./types";

/**
 * 직접 수집한 ECMWF·GFS·ICON 예보(collector/, R2 버킷 tripnal-data)를 읽는 provider.
 *
 * - 격자(0.25°)의 둘러싼 네 점을 읽어 고도 보정 후 거리 가중(쌍선형)으로 지점 값을 낸다.
 * - 3·6시간 간격 값을 1시간 간격으로 풀고, 세 모델의 중간값을 쓴다 (openMeteo.ts와 같은 규칙).
 * - 체감온도·날씨 코드·자외선은 받은 값으로 계산한다. 파고는 GFS-Wave, 강수 확률은 GEFS 앙상블. 해수면·대기질은 아직 없다.
 */

export const COLLECTED_MODELS = ["ecmwf", "gfs", "icon"] as const;
export type CollectedModel = (typeof COLLECTED_MODELS)[number];

/** collector가 격자점마다 남기는 JSON */
export interface PointFile {
  model: string;
  run: string;
  lat: number;
  lon: number;
  elevation: number | null;
  /** run 기준 시간 */
  step: number[];
  temp: (number | null)[];
  dew: (number | null)[];
  wind: (number | null)[];
  dir: (number | null)[];
  /** 앞 step부터 이 step까지 최대 돌풍 */
  gust: (number | null)[];
  /** 앞 step부터 이 step까지 합 (mm) */
  precip: (number | null)[];
  /** 앞 step부터 이 step까지 합 (mm 물당량) */
  snow: (number | null)[];
  cloud: (number | null)[];
  cape: (number | null)[];
  vis?: (number | null)[];
}

const GRID = { latMin: 32.5, latMax: 39.5, lonMin: 124, lonMax: 132, res: 0.25 };
const LAPSE = 0.0065;
const DAYS = 16;
/** 뇌우 코드는 두 모델 이상이 같은 시각에 낼 때만 남긴다 */
const THUNDER_AGREE = 2;
/** 눈 물당량 1mm ≈ 신적설 0.7cm (Open-Meteo와 같은 환산) */
const SNOW_CM_PER_MM = 0.7;

type Num = number | null;

function round1(v: Num): Num {
  return v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10;
}

/** run "YYYYMMDDHH"(UTC) → epoch ms */
function runTime(run: string): number {
  return Date.UTC(+run.slice(0, 4), +run.slice(4, 6) - 1, +run.slice(6, 8), +run.slice(8, 10));
}

/** "YYYY-MM-DDTHH:00"(KST) → epoch ms */
function kstKeyTime(key: string): number {
  return Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10), +key.slice(11, 13)) - 9 * 3600e3;
}

/** 오늘 0시(KST)부터 16일치 시각 */
export function hourKeys(now: Date = new Date()): string[] {
  const start = kstDate(now);
  const out: string[] = [];
  for (let d = 0; d < DAYS; d++) {
    const date = addDays(start, d);
    for (let h = 0; h < 24; h++) out.push(`${date}T${h < 10 ? "0" : ""}${h}:00`);
  }
  return out;
}

/** 지점을 둘러싼 격자 네 점과 가중치 */
export function corners(lat: number, lon: number) {
  const y = (Math.min(Math.max(lat, GRID.latMin), GRID.latMax) - GRID.latMin) / GRID.res;
  const x = (Math.min(Math.max(lon, GRID.lonMin), GRID.lonMax) - GRID.lonMin) / GRID.res;
  const y0 = Math.min(Math.floor(y), (GRID.latMax - GRID.latMin) / GRID.res - 1);
  const x0 = Math.min(Math.floor(x), (GRID.lonMax - GRID.lonMin) / GRID.res - 1);
  const fy = y - y0;
  const fx = x - x0;
  const at = (dy: number, dx: number, w: number) => ({
    lat: GRID.latMin + (y0 + dy) * GRID.res,
    lon: GRID.lonMin + (x0 + dx) * GRID.res,
    w,
  });
  return [at(0, 0, (1 - fy) * (1 - fx)), at(0, 1, (1 - fy) * fx), at(1, 0, fy * (1 - fx)), at(1, 1, fy * fx)];
}

export function pointKey(model: CollectedModel, run: string, lat: number, lon: number): string {
  return `${model}/${run}/${lat.toFixed(2)}_${lon.toFixed(2)}.json`;
}

/** 한 모델의 시간별 값 (지점 하나) */
interface ModelHourly {
  temp: Num[];
  dew: Num[];
  u: Num[];
  v: Num[];
  gust: Num[];
  precip: Num[];
  snow: Num[];
  cloud: Num[];
  cape: Num[];
  vis: Num[];
  elevation: Num;
}

/**
 * step 값을 시각별로 푼다.
 * 순간값(기온 등)은 앞뒤 step 사이를 직선으로 잇고, 구간값(강수·돌풍)은 그 시각이 속한 구간 값을 쓴다
 * (강수는 구간 길이로 나눠 시간당 값으로).
 */
/** run 기준 시간(step)의 순간값을 시각별로 직선 보간 */
export function linearSteps(run: string, step: number[], vals: Num[], keys: string[]): Num[] {
  const t0 = runTime(run);
  const last = step[step.length - 1];
  return keys.map((k) => {
    const h = (kstKeyTime(k) - t0) / 3600e3;
    if (h < 0 || h > last) return null;
    const i = step.findIndex((s) => s >= h);
    if (step[i] === h) return vals[i];
    const a = vals[i - 1];
    const b = vals[i];
    if (a == null || b == null) return null;
    return a + ((b - a) * (h - step[i - 1])) / (step[i] - step[i - 1]);
  });
}

export function expand(p: PointFile, keys: string[]): Omit<ModelHourly, "elevation"> {
  const t0 = runTime(p.run);
  const hours = keys.map((k) => (kstKeyTime(k) - t0) / 3600e3);
  const last = p.step[p.step.length - 1];
  const linear = (vals: Num[]) => linearSteps(p.run, p.step, vals, keys);
  const interval = (vals: Num[], perHour: boolean) =>
    hours.map((h) => {
      // h시 값 = (h-1, h] 구간. step 0 이전·마지막 이후는 없음
      if (h <= 0 || h > last) return null;
      const i = p.step.findIndex((s) => s >= h);
      const x = vals[i];
      if (x == null) return null;
      return perHour ? x / (p.step[i] - p.step[i - 1]) : x;
    });
  const rad = (d: Num) => (d == null ? null : (d * Math.PI) / 180);
  // 풍향은 벡터로 잇는다 (350°와 10° 사이가 180°가 되지 않게)
  const us = p.wind.map((w, i) => (w == null || p.dir[i] == null ? null : -w * Math.sin(rad(p.dir[i])!)));
  const vs = p.wind.map((w, i) => (w == null || p.dir[i] == null ? null : -w * Math.cos(rad(p.dir[i])!)));
  return {
    temp: linear(p.temp),
    dew: linear(p.dew),
    u: linear(us),
    v: linear(vs),
    gust: interval(p.gust, false),
    precip: interval(p.precip, true),
    snow: interval(p.snow, true),
    cloud: linear(p.cloud),
    cape: linear(p.cape),
    vis: p.vis ? linear(p.vis) : keys.map(() => null),
  };
}

/** 둘러싼 네 점을 고도 보정한 뒤 가중 평균 */
export function combineCorners(points: { file: PointFile; w: number }[], keys: string[], target: number | null): ModelHourly {
  const parts = points.map(({ file, w }) => ({ w, e: file.elevation, h: expand(file, keys) }));
  const wsum = (pick: (part: (typeof parts)[number], i: number) => Num) =>
    keys.map((_, i) => {
      let s = 0;
      let ws = 0;
      for (const part of parts) {
        const x = pick(part, i);
        if (x == null) continue;
        s += x * part.w;
        ws += part.w;
      }
      return ws > 0 ? s / ws : null;
    });
  const elevation = wsum((p) => p.e)[0];
  const lapse = (p: (typeof parts)[number]) => (target == null || p.e == null ? 0 : (p.e - target) * LAPSE);
  return {
    temp: wsum((p, i) => (p.h.temp[i] == null ? null : p.h.temp[i]! + lapse(p))),
    dew: wsum((p, i) => (p.h.dew[i] == null ? null : p.h.dew[i]! + lapse(p))),
    u: wsum((p, i) => p.h.u[i]),
    v: wsum((p, i) => p.h.v[i]),
    gust: wsum((p, i) => p.h.gust[i]),
    precip: wsum((p, i) => p.h.precip[i]),
    snow: wsum((p, i) => p.h.snow[i]),
    cloud: wsum((p, i) => p.h.cloud[i]),
    cape: wsum((p, i) => p.h.cape[i]),
    vis: wsum((p, i) => p.h.vis[i]),
    elevation,
  };
}

export function median(xs: Num[]): Num {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** 체감온도 (호주 기상청 식, 일사 제외). 습도는 이슬점에서 구한다 */
export function apparent(t: Num, dew: Num, wind: Num): Num {
  if (t == null || dew == null || wind == null) return null;
  const e = 6.105 * Math.exp((17.27 * dew) / (237.7 + dew));
  return t + 0.33 * e - 0.7 * wind - 4;
}

/** 맑은 날 자외선 지수를 태양 고도로 구하고 구름으로 줄인다 */
export function uvIndex(time: string, lat: number, lon: number, cloud: Num): Num {
  // suncalc 2.x는 고도를 도(°) 단위로 준다
  const alt = getPosition(new Date(kstKeyTime(time) + 30 * 60e3), lat, lon).altitude;
  if (alt <= 0) return 0;
  const clear = 12.5 * Math.pow(Math.sin((alt * Math.PI) / 180), 2.42);
  const c = (cloud ?? 0) / 100;
  return clear * (1 - 0.56 * Math.pow(c, 2.5));
}

/** 한 시각의 날씨 코드 (WMO). thunder: 뇌우 조건을 낸 모델 수 */
export function weatherCode(precip: Num, snow: Num, cloud: Num, cape: Num, vis: Num, thunder: number): Num {
  if (precip == null && cloud == null) return null;
  const p = precip ?? 0;
  if (p >= 0.1) {
    if (thunder >= THUNDER_AGREE) return 95;
    if ((snow ?? 0) >= p * 0.5) {
      const cm = (snow ?? 0) * SNOW_CM_PER_MM;
      return cm < 0.2 ? 71 : cm < 1 ? 73 : 75;
    }
    const shower = (cape ?? 0) >= 300;
    if (p < 2.5) return shower ? 80 : 61;
    if (p < 7.6) return shower ? 81 : 63;
    return shower ? 82 : 65;
  }
  if (vis != null && vis < 1000) return 45;
  const c = cloud ?? 0;
  return c < 20 ? 0 : c < 50 ? 1 : c < 85 ? 2 : 3;
}

/** 모델별 시간 값을 하나의 시계열로 */
export function blendCollected(models: ModelHourly[], keys: string[], lat: number, lon: number): HourlySeries {
  const med = (pick: (m: ModelHourly) => Num[]) => keys.map((_, i) => median(models.map((m) => pick(m)[i])));
  const temp = med((m) => m.temp);
  const dew = med((m) => m.dew);
  const speed = models.map((m) => keys.map((_, i) => (m.u[i] == null || m.v[i] == null ? null : Math.hypot(m.u[i]!, m.v[i]!))));
  const wind = keys.map((_, i) => median(speed.map((s) => s[i])));
  // 풍향은 모델 벡터 평균
  const dir = keys.map((_, i) => {
    let u = 0;
    let v = 0;
    let n = 0;
    for (const m of models) {
      if (m.u[i] == null || m.v[i] == null) continue;
      u += m.u[i]!;
      v += m.v[i]!;
      n++;
    }
    return n ? Math.round(((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360) : null;
  });
  const gust = med((m) => m.gust);
  const precip = med((m) => m.precip);
  const snow = med((m) => m.snow);
  const cloud = med((m) => m.cloud);
  const cape = med((m) => m.cape);
  const vis = med((m) => m.vis);
  const thunder = keys.map((_, i) => models.filter((m) => (m.precip[i] ?? 0) >= 0.5 && (m.cape[i] ?? 0) >= 1000).length);
  return {
    time: keys,
    temperature: temp.map(round1),
    apparentTemperature: keys.map((_, i) => round1(apparent(temp[i], dew[i], wind[i]))),
    precipitation: precip.map(round1),
    precipitationProbability: keys.map(() => null),
    cloudCover: cloud.map((c) => (c == null ? null : Math.round(c))),
    windSpeed: wind.map(round1),
    // 돌풍이 평균 풍속보다 작게 나오는 모델 조합은 풍속으로 맞춘다
    windGusts: gust.map((g, i) => round1(g == null ? null : Math.max(g, wind[i] ?? 0))),
    windDirection: dir,
    weatherCode: keys.map((_, i) => weatherCode(precip[i], snow[i], cloud[i], cape[i], vis[i], thunder[i])),
    snowfall: snow.map((s) => round1(s == null ? null : s * SNOW_CM_PER_MM)),
    visibility: vis.map((x) => (x == null ? null : Math.round(x))),
    uvIndex: keys.map((k, i) => round1(uvIndex(k, lat, lon, cloud[i]))),
    cape: cape.map((c) => (c == null ? null : Math.round(c))),
  };
}

/** R2 버킷에서 필요한 최소 기능 */
export interface DataBucket {
  get(
    key: string,
    options?: { range: { offset: number; length: number } },
  ): Promise<{ json<T>(): Promise<T>; arrayBuffer(): Promise<ArrayBuffer> } | null>;
}

/** 지형 고도 격자 dem/korea.bin (collector/dem.py): 15초 간격, 북→남·서→동 int16 */
const DEM = { key: "dem/korea.bin", perDeg: 240, rows: 1680, cols: 1920 };

/** 지점이 속한 칸의 지형 고도(m). 바다는 0, 영역 밖이나 자료가 없으면 null */
export async function demElevation(b: DataBucket, lat: number, lon: number): Promise<number | null> {
  // 경계에 걸린 좌표가 부동소수 오차로 윗칸에 붙지 않게 아주 작은 값을 더한다
  const r = Math.floor((GRID.latMax - lat) * DEM.perDeg + 1e-9);
  const c = Math.floor((lon - GRID.lonMin) * DEM.perDeg + 1e-9);
  if (r < 0 || c < 0 || r >= DEM.rows || c >= DEM.cols) return null;
  return cached(`dem:${r}:${c}`, async () => {
    const o = await b.get(DEM.key, { range: { offset: (r * DEM.cols + c) * 2, length: 2 } });
    if (!o) return null;
    return new DataView(await o.arrayBuffer()).getInt16(0, true);
  }).catch(() => null);
}

async function bucket(): Promise<DataBucket> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const env = (await getCloudflareContext({ async: true })).env as unknown as { DATA?: DataBucket };
  if (!env.DATA) throw new Error("R2 바인딩(DATA)이 없음");
  return env.DATA;
}

/** 같은 run의 격자점은 바뀌지 않으므로 Worker 메모리에 잠시 둔다 */
const memo = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = memo.get(key) as Promise<T> | undefined;
  if (!p) {
    if (memo.size > 2000) memo.clear();
    p = load().catch((e) => {
      memo.delete(key);
      throw e;
    });
    memo.set(key, p);
  }
  return p;
}

/** 최신 run은 5분 동안 기억한다 (버킷마다 따로) */
const latestMemos = new WeakMap<DataBucket, Map<string, { at: number; run: Promise<string | null> }>>();
function latestRun(b: DataBucket, model: CollectedModel | "wave" | "gefs"): Promise<string | null> {
  let latestMemo = latestMemos.get(b);
  if (!latestMemo) latestMemos.set(b, (latestMemo = new Map()));
  const hit = latestMemo.get(model);
  if (hit && Date.now() - hit.at < 5 * 60e3) return hit.run;
  const run = b
    .get(`${model}/latest.json`)
    .then((o) => (o ? o.json<{ run: string }>() : null))
    .then((j) => j?.run ?? null)
    .catch(() => null);
  latestMemo.set(model, { at: Date.now(), run });
  return run;
}

/** GFS-Wave 바다 격자점 (collector/gfswave.py) */
export interface WavePointFile {
  run: string;
  step: number[];
  wave: Num[];
  windwave: Num[];
  period: Num[];
}

/**
 * 파고. 둘러싼 네 점 중 바다인 점만 가중 평균한다. 네 점이 모두 육지면(내륙) 없음.
 */
export async function loadWave(b: DataBucket, cs: ReturnType<typeof corners>, keys: string[]) {
  const run = await latestRun(b, "wave");
  if (!run) return null;
  const sea = await cached(`wave/${run}/sea.json`, () =>
    b.get(`wave/${run}/sea.json`).then(async (o) => new Set(o ? await o.json<string[]>() : [])),
  );
  const near = cs.filter((c) => sea.has(`${c.lat.toFixed(2)}_${c.lon.toFixed(2)}`));
  if (!near.length) return null;
  const files = await Promise.all(
    near.map((c) => {
      const key = `wave/${run}/${c.lat.toFixed(2)}_${c.lon.toFixed(2)}.json`;
      return cached(key, () => b.get(key).then((o) => (o ? o.json<WavePointFile>() : null)));
    }),
  );
  const mix = (pick: (f: WavePointFile) => Num[]) => {
    // 지점이 격자선 위에 있으면 바다 쪽 점의 가중치가 0일 수 있어 아주 작은 값을 더한다 (해안 지점)
    const series = files.map((f, i) => (f ? { w: near[i].w + 1e-3, v: linearSteps(f.run, f.step, pick(f), keys) } : null));
    return keys.map((_, i) => {
      let s = 0;
      let ws = 0;
      for (const x of series) {
        if (!x || x.v[i] == null) continue;
        s += x.v[i]! * x.w;
        ws += x.w;
      }
      return ws > 0 ? round1(s / ws) : null;
    });
  };
  return { waveHeight: mix((f) => f.wave), windWaveHeight: mix((f) => f.windwave) };
}

/** GEFS 6시간 강수 확률 격자점 (collector/gefs.py) */
export interface ProbPointFile {
  run: string;
  /** 6시간 구간의 끝 */
  step: number[];
  prob: Num[];
}

/** 시각별 강수 확률(%): 그 시각이 속한 6시간 구간의 확률을 네 점 가중 평균 */
export async function loadProbability(b: DataBucket, cs: ReturnType<typeof corners>, keys: string[]): Promise<Num[] | null> {
  const run = await latestRun(b, "gefs");
  if (!run) return null;
  const files = await Promise.all(
    cs.map((c) => {
      const key = `gefs/${run}/${c.lat.toFixed(2)}_${c.lon.toFixed(2)}.json`;
      return cached(key, () => b.get(key).then((o) => (o ? o.json<ProbPointFile>() : null)));
    }),
  );
  const t0 = runTime(run);
  return keys.map((k) => {
    const h = (kstKeyTime(k) - t0) / 3600e3;
    let s = 0;
    let ws = 0;
    files.forEach((f, i) => {
      if (!f) return;
      const j = f.step.findIndex((x) => x >= h && x - 6 < h);
      const v = j < 0 ? null : f.prob[j];
      if (v == null) return;
      s += v * cs[i].w;
      ws += cs[i].w;
    });
    return ws > 0 ? Math.round(s / ws) : null;
  });
}

export async function loadCollected(b: DataBucket, lat: number, lon: number, elevation?: number, now = new Date()): Promise<RawForecast> {
  const keys = hourKeys(now);
  const cs = corners(lat, lon);
  const dem = elevation == null ? demElevation(b, lat, lon) : null;
  // 바다가 없어도 예보는 보여준다
  const wave = loadWave(b, cs, keys).catch(() => null);
  const prob = loadProbability(b, cs, keys).catch(() => null);
  const models = await Promise.all(
    COLLECTED_MODELS.map(async (model) => {
      const run = await latestRun(b, model);
      if (!run) return null;
      const files = await Promise.all(
        cs.map((c) => {
          const key = pointKey(model, run, c.lat, c.lon);
          return cached(key, () => b.get(key).then((o) => (o ? o.json<PointFile>() : null)));
        }),
      );
      const points = files.flatMap((file, i) => (file ? [{ file, w: cs[i].w }] : []));
      if (!points.length) return null;
      return { model, run, points };
    }),
  );
  const ok = models.filter((m) => m != null);
  if (!ok.length) throw new Error("수집 예보가 없음");
  // 지점 고도를 모르면 지형 고도 격자에서, 그것도 없으면 모델 지형 고도를 쓴다 (보정 없음)
  const target = elevation ?? (await dem);
  const gridElev = median(ok.map((m) => combineCorners(m.points, keys.slice(0, 1), null).elevation));
  const hourly = blendCollected(
    ok.map((m) => combineCorners(m.points, keys, target)),
    keys,
    lat,
    lon,
  );
  const w = await wave;
  if (w) Object.assign(hourly, w);
  const p = await prob;
  if (p) hourly.precipitationProbability = p;
  const names: Record<CollectedModel, string> = { ecmwf: "ECMWF", gfs: "GFS", icon: "ICON" };
  return {
    latitude: lat,
    longitude: lon,
    elevation: target ?? (gridElev == null ? null : Math.round(gridElev)),
    hourly,
    source: ok.map((m) => names[m.model]).join("·"),
  };
}

export const collectedProvider: WeatherProvider = {
  name: "collected",
  async fetchHourly(lat, lon, elevation) {
    return loadCollected(await bucket(), lat, lon, elevation);
  },
};
