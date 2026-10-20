import { getPosition } from "suncalc";
import { addDays, kstDate } from "@/lib/time";
import type { DatedTideEvent, HourlySeries, RawForecast, WeatherProvider } from "./types";

/**
 * 직접 수집한 ECMWF·GFS·ICON 예보(collector/, R2 버킷 tripnal-data)를 읽는 provider.
 *
 * - 격자(0.25°)의 둘러싼 네 점을 읽어 고도 보정 후 거리 가중(쌍선형)으로 지점 값을 낸다.
 * - 3·6시간 간격 값을 1시간 간격으로 풀고, 세 모델의 중간값을 쓴다 (openMeteo.ts와 같은 규칙).
 * - 체감온도·날씨 코드·자외선은 받은 값으로 계산한다. 파고는 GFS-Wave, 강수 확률은 GEFS 앙상블,
 *   미세먼지는 CAMS(5일), 만조·간조는 가까운 국립해양조사원 관측소 예보.
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

const present = (xs: Num[]) => xs.filter((x): x is number => x != null && Number.isFinite(x));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * 날짜별 예측 가능성(%). 실제 적중률이 아니라 예보끼리 얼마나 같은 날씨를 내다보는지다.
 * - 세 모델의 기온·풍속 차이, 비가 오는지에 대한 엇갈림, 비 양의 차이
 * - GEFS 31개 앙상블의 강수 확률이 50%에 가까울수록(반반으로 갈릴수록) 낮춘다
 * - 모델이 하나뿐인 먼 날은 비교할 수 없으므로, 날이 멀수록 상한을 낮춘다
 * 결과는 30~90을 10 단위로 둔다.
 */
export function predictability(models: ModelHourly[], keys: string[], prob: Num[] | null): Record<string, number> {
  const byDate = new Map<string, number[]>();
  keys.forEach((k, i) => {
    const d = k.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(i);
  });
  const out: Record<string, number> = {};
  [...byDate.entries()].forEach(([date, idx], day) => {
    const speed = (m: ModelHourly, i: number) => (m.u[i] == null || m.v[i] == null ? null : Math.hypot(m.u[i]!, m.v[i]!));
    const spread = (pick: (m: ModelHourly, i: number) => Num) =>
      mean(
        idx.flatMap((i) => {
          const xs = present(models.map((m) => pick(m, i)));
          return xs.length >= 2 ? [Math.max(...xs) - Math.min(...xs)] : [];
        }),
      );
    const temp = spread((m, i) => m.temp[i]);
    const wind = spread(speed);
    // 하루 강수 합이 모델마다 있는 경우만 (뒤쪽 날은 모델이 줄어든다)
    const totals = models.flatMap((m) => {
      const xs = idx.map((i) => m.precip[i]);
      return xs.every((x) => x == null) ? [] : [present(xs).reduce((a, b) => a + b, 0)];
    });
    const n = Math.min(totals.length, temp == null ? 1 : 3);
    const wet = totals.filter((t) => t >= 1).length;
    const split = totals.length >= 2 && wet > 0 && wet < totals.length ? 1 : 0;
    const amount = totals.length >= 2 && wet === totals.length ? (Math.max(...totals) - Math.min(...totals)) / (Math.max(...totals) + 5) : 0;
    // 앙상블이 반반으로 갈린 정도 0~1
    const ps = prob ? present(idx.map((i) => prob[i])) : [];
    const ens = ps.length ? mean(ps.map((p) => 1 - Math.abs(p / 50 - 1)))! : null;
    let score = 100 - 6 * (temp ?? 0) - 2.5 * (wind ?? 0) - 18 * split - 15 * amount - 30 * (ens ?? 0.3);
    // 비교할 모델이 하나뿐이면 차이를 알 수 없으니 깎는다
    if (n < 2) score -= 10;
    const cap = 92 - 3 * day;
    const v = Math.round(Math.min(score, cap) / 10) * 10;
    out[date] = Math.max(30, Math.min(90, v));
  });
  return out;
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
function latestRun(b: DataBucket, model: CollectedModel | "wave" | "gefs" | "cams"): Promise<string | null> {
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

/** CAMS 미세먼지 격자점 (collector/cams.py) */
export interface AirPointFile {
  run: string;
  step: number[];
  pm10: Num[];
  pm25: Num[];
}

/** 미세먼지 µg/m³: 네 점 가중 평균을 시각별로 잇는다 (CAMS는 5일까지) */
export async function loadAirQuality(b: DataBucket, cs: ReturnType<typeof corners>, keys: string[]) {
  const run = await latestRun(b, "cams");
  if (!run) return null;
  const files = await Promise.all(
    cs.map((c) => {
      const key = `cams/${run}/${c.lat.toFixed(2)}_${c.lon.toFixed(2)}.json`;
      return cached(key, () => b.get(key).then((o) => (o ? o.json<AirPointFile>() : null)));
    }),
  );
  const mix = (pick: (f: AirPointFile) => Num[]) => {
    const series = files.map((f, i) => (f ? { w: cs[i].w, v: linearSteps(f.run, f.step, pick(f), keys) } : null));
    return keys.map((_, i) => {
      let s = 0;
      let ws = 0;
      for (const x of series) {
        if (!x || x.v[i] == null) continue;
        s += x.v[i]! * x.w;
        ws += x.w;
      }
      return ws > 0 ? Math.round(s / ws) : null;
    });
  };
  if (!files.some((f) => f)) return null;
  return { pm10: mix((f) => f.pm10), pm25: mix((f) => f.pm25) };
}

/** 국립해양조사원 관측소 (collector/tide.py) */
export interface TideStation {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export interface TideFile extends TideStation {
  /** 받은 기간 평균 조위 cm */
  msl: number;
  /** ["YYYY-MM-DD HH:MM", "H"|"L", 조위 cm] */
  events: [string, "H" | "L", number][];
}

/** 이 거리(km) 안의 관측소만 쓴다. 바다 격자가 없는 곳은 TIDE_NEAR_KM 안일 때만 */
const TIDE_MAX_KM = 25;
const TIDE_NEAR_KM = 5;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.hypot(x, y) * 6371;
}

/** "YYYY-MM-DD HH:MM"(KST) → epoch ms */
function kstEventTime(at: string): number {
  return Date.UTC(+at.slice(0, 4), +at.slice(5, 7) - 1, +at.slice(8, 10), +at.slice(11, 13), +at.slice(14, 16)) - 9 * 3600e3;
}

/**
 * 가장 가까운 관측소의 만조·간조와, 그 사이를 코사인으로 이은 시각별 해수면 높이(m, 평균 해수면 기준).
 * coastal: 둘러싼 격자에 바다가 있는지 (내륙이면 아주 가까운 관측소만 쓴다)
 */
export async function loadTide(b: DataBucket, lat: number, lon: number, keys: string[], coastal: boolean) {
  const day = keys[0].slice(0, 10);
  // 없을 때는 기억하지 않는다 (cached는 실패한 값을 지운다)
  const stations = await cached(`tide/stations.json:${day}`, () =>
    b.get("tide/stations.json").then((o) => {
      if (!o) throw new Error("관측소 목록 없음");
      return o.json<TideStation[]>();
    }),
  );
  let best: TideStation | null = null;
  let bestKm = Infinity;
  for (const s of stations) {
    const km = distanceKm(lat, lon, s.lat, s.lon);
    if (km < bestKm) [best, bestKm] = [s, km];
  }
  if (!best || bestKm > (coastal ? TIDE_MAX_KM : TIDE_NEAR_KM)) return null;
  const code = best.code;
  const file = await cached(`tide/${code}.json:${day}`, () =>
    b.get(`tide/${code}.json`).then((o) => {
      if (!o) throw new Error(`${code} 없음`);
      return o.json<TideFile>();
    }),
  );
  if (!file.events.length) return null;
  const events = file.events.map(([at, kind, cm]) => ({ at, t: kstEventTime(at), type: kind === "H" ? ("high" as const) : ("low" as const), level: Math.round(cm - file.msl) / 100 }));
  let j = 0;
  const seaLevel = keys.map((k) => {
    const t = kstKeyTime(k);
    while (j + 1 < events.length && events[j + 1].t <= t) j++;
    const a = events[j];
    const c = events[j + 1];
    if (a.t === t) return a.level;
    if (!c || a.t > t) return null;
    const f = (t - a.t) / (c.t - a.t);
    return Math.round((a.level + ((c.level - a.level) * (1 - Math.cos(Math.PI * f))) / 2) * 100) / 100;
  });
  const tideEvents: DatedTideEvent[] = events.filter((e) => e.at >= day).map(({ at, type, level }) => ({ at, type, level }));
  return { seaLevel, tideEvents, station: file.name };
}

export async function loadCollected(b: DataBucket, lat: number, lon: number, elevation?: number, now = new Date()): Promise<RawForecast> {
  const keys = hourKeys(now);
  const cs = corners(lat, lon);
  const dem = elevation == null ? demElevation(b, lat, lon) : null;
  // 바다가 없어도 예보는 보여준다
  const wave = loadWave(b, cs, keys).catch(() => null);
  const prob = loadProbability(b, cs, keys).catch(() => null);
  const air = loadAirQuality(b, cs, keys).catch(() => null);
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
  const perModel = ok.map((m) => combineCorners(m.points, keys, target));
  const hourly = blendCollected(perModel, keys, lat, lon);
  const w = await wave;
  if (w) Object.assign(hourly, w);
  const tide = await loadTide(b, lat, lon, keys, w != null).catch(() => null);
  if (tide) hourly.seaLevel = tide.seaLevel;
  const p = await prob;
  if (p) hourly.precipitationProbability = p;
  const q = await air;
  if (q) Object.assign(hourly, q);
  const names: Record<CollectedModel, string> = { ecmwf: "ECMWF", gfs: "GFS", icon: "ICON" };
  return {
    latitude: lat,
    longitude: lon,
    elevation: target ?? (gridElev == null ? null : Math.round(gridElev)),
    hourly,
    source: ok.map((m) => names[m.model]).join("·"),
    ...(tide ? { tideEvents: tide.tideEvents } : {}),
    predictability: predictability(perModel, keys, p),
  };
}

export const collectedProvider: WeatherProvider = {
  name: "collected",
  async fetchHourly(lat, lon, elevation) {
    return loadCollected(await bucket(), lat, lon, elevation);
  },
};
