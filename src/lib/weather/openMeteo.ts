import { fetchJsonCached } from "@/lib/cache";
import type { HourlySeries, RawForecast, WeatherProvider } from "./types";

const HOURLY = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "weather_code",
  "snowfall",
  "visibility",
  "uv_index",
  "cape",
] as const;

const MARINE = ["wave_height", "wind_wave_height", "sea_level_height_msl"] as const;
const AIR = ["pm10", "pm2_5"] as const;

interface HourlyOnly<K extends string> {
  hourly: Record<K | "time", (number | null)[] | string[]>;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation?: number;
  hourly: Partial<Record<(typeof HOURLY)[number], (number | null)[]>> & { time: string[] };
}

/**
 * 모델 순서. 앞쪽 사흘은 기상청(LDPS 1.5km + GDPS)을 먼저 쓰고,
 * 그 뒤는 ECMWF·GFS·ICON 세 모델의 중간값을 쓴다 (한 모델만 튀는 돌풍·강수를 걸러낸다).
 * 비어 있는 값(강수 확률·자외선, 15일 이후 등)은 Open-Meteo 기본 조합(best_match)으로 채운다.
 */
export const MODELS = ["kma_seamless", "ecmwf_ifs", "best_match", "gfs_seamless", "icon_seamless"] as const;
type Model = (typeof MODELS)[number];
/** 기상청 모델을 먼저 쓰는 기간 (시간) */
const KMA_HOURS = 72;
/** 사흘 뒤부터 중간값을 내는 모델 */
const ENSEMBLE: readonly Model[] = ["ecmwf_ifs", "gfs_seamless", "icon_seamless"];
/** 중간값을 내는 변수. 풍향·확률·자외선·시정·날씨 코드는 그대로 ECMWF 우선 */
const MEDIAN_VARS = new Set<string>([
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "snowfall",
  "cape",
]);
/** 뇌우 코드(95~99)는 두 모델 이상이 같은 시각에 낼 때만 남긴다 */
const THUNDER_AGREE = 2;

export function buildOpenMeteoUrl(lat: number, lon: number, apiKey?: string, elevation?: number, models?: readonly Model[]): string {
  // 유료 키가 있으면 customer- 호스트를 쓴다 (상업용).
  const host = apiKey ? "https://customer-api.open-meteo.com" : "https://api.open-meteo.com";
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: HOURLY.join(","),
    forecast_days: "16",
    timezone: "Asia/Seoul",
    wind_speed_unit: "ms",
  });
  if (elevation != null) params.set("elevation", String(elevation));
  if (models) params.set("models", models.join(","));
  if (apiKey) params.set("apikey", apiKey);
  return `${host}/v1/forecast?${params}`;
}

function baseParams(lat: number, lon: number, apiKey?: string) {
  const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: "Asia/Seoul" });
  if (apiKey) params.set("apikey", apiKey);
  return params;
}

/** 바다 예보(파고·풍랑·해수면). 육지 한가운데는 값이 비어 온다 */
export function buildMarineUrl(lat: number, lon: number, apiKey?: string, days = 16): string {
  const host = apiKey ? "https://customer-marine-api.open-meteo.com" : "https://marine-api.open-meteo.com";
  const params = baseParams(lat, lon, apiKey);
  params.set("hourly", MARINE.join(","));
  params.set("forecast_days", String(days));
  return `${host}/v1/marine?${params}`;
}

/** 대기질(미세먼지). 예보는 약 5일까지 */
export function buildAirUrl(lat: number, lon: number, apiKey?: string): string {
  const host = apiKey ? "https://customer-air-quality-api.open-meteo.com" : "https://air-quality-api.open-meteo.com";
  const params = baseParams(lat, lon, apiKey);
  params.set("hourly", AIR.join(","));
  params.set("forecast_days", "7");
  return `${host}/v1/air-quality?${params}`;
}

/** 다른 API의 시간별 값을 예보 시각에 맞춰 붙인다 */
function align<K extends string>(time: string[], json: HourlyOnly<K> | null, key: K): (number | null)[] | undefined {
  if (!json?.hourly?.time) return undefined;
  const at = new Map<string, number | null>();
  const t = json.hourly.time as string[];
  const v = json.hourly[key] as (number | null)[];
  t.forEach((x, i) => at.set(x, v?.[i] ?? null));
  return time.map((x) => at.get(x) ?? null);
}

type Series = (number | null)[];

/**
 * 여러 모델을 한 번에 요청하면 변수 이름 뒤에 _모델명이 붙어 온다.
 * 앞쪽 사흘은 기상청 → ECMWF → 기본 순서로 처음 나오는 값을 고르고,
 * 그 뒤는 ECMWF·GFS·ICON 중간값(없으면 ECMWF → 기본 → 기상청 순서)으로 하나의 시계열을 만든다.
 */
export function blendModels(json: OpenMeteoResponse, models: readonly Model[] = MODELS): OpenMeteoResponse {
  const h = json.hourly as unknown as Record<string, Series | string[]>;
  const time = json.hourly.time;
  const start = time.findIndex((t) => t.slice(0, 13) >= kstNowHour());
  const from = start < 0 ? 0 : start;
  const series = (v: string, m: Model) => (models.includes(m) ? (h[`${v}_${m}`] as Series | undefined) : undefined);
  const out: Record<string, Series | string[]> = { time };
  for (const v of HOURLY) {
    if (models.every((m) => !h[`${v}_${m}`])) {
      if (h[v]) out[v] = h[v];
      continue;
    }
    const at = (m: Model, i: number) => series(v, m)?.[i] ?? null;
    const first = (order: readonly Model[], i: number) => {
      for (const m of order) {
        const x = at(m, i);
        if (x != null) return x;
      }
      return null;
    };
    out[v] = time.map((_, i) => {
      if (i - from < KMA_HOURS) return first(["kma_seamless", "ecmwf_ifs", "best_match"], i);
      const fallback = () => first(["ecmwf_ifs", "best_match", "kma_seamless"], i);
      if (MEDIAN_VARS.has(v)) return median(ENSEMBLE.map((m) => at(m, i))) ?? fallback();
      if (v === "weather_code") {
        const x = fallback();
        if (x == null || x < 95) return x;
        const agree = ENSEMBLE.filter((m) => (at(m, i) ?? 0) >= 95).length;
        // 혼자 낸 뇌우는 소나기로 낮춘다
        return agree >= THUNDER_AGREE ? x : 81;
      }
      return fallback();
    });
  }
  return { ...json, hourly: out as OpenMeteoResponse["hourly"] };
}

function median(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : Math.round(((v[m - 1] + v[m]) / 2) * 10) / 10;
}

function kstNowHour(): string {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 13);
}

export function parseOpenMeteo(
  json: OpenMeteoResponse,
  marine: HourlyOnly<(typeof MARINE)[number]> | null = null,
  air: HourlyOnly<(typeof AIR)[number]> | null = null,
  source = "Open-Meteo",
): RawForecast {
  const h = json.hourly;
  const nums = (k: (typeof HOURLY)[number]) => h[k] ?? h.time.map(() => null);
  const hourly: HourlySeries = {
    time: h.time,
    temperature: nums("temperature_2m"),
    apparentTemperature: nums("apparent_temperature"),
    precipitation: nums("precipitation"),
    precipitationProbability: nums("precipitation_probability"),
    cloudCover: nums("cloud_cover"),
    windSpeed: nums("wind_speed_10m"),
    windGusts: nums("wind_gusts_10m"),
    windDirection: nums("wind_direction_10m"),
    weatherCode: nums("weather_code"),
    snowfall: nums("snowfall"),
    visibility: nums("visibility"),
    uvIndex: nums("uv_index"),
    cape: nums("cape"),
  };
  const time = hourly.time;
  hourly.waveHeight = align(time, marine, "wave_height");
  hourly.windWaveHeight = align(time, marine, "wind_wave_height");
  hourly.seaLevel = align(time, marine, "sea_level_height_msl");
  hourly.pm10 = align(time, air, "pm10");
  hourly.pm25 = align(time, air, "pm2_5");
  return {
    latitude: json.latitude,
    longitude: json.longitude,
    elevation: json.elevation ?? null,
    hourly,
    source,
  };
}

export const openMeteoProvider: WeatherProvider = {
  name: "open-meteo",
  async fetchHourly(lat, lon, elevation) {
    const key = process.env.OPEN_METEO_API_KEY;
    // 바다·대기질은 없어도 기본 예보는 보여준다
    const optional = <T,>(url: string) => fetchJsonCached<T>(url, 1800).catch(() => null);
    // 기상청·ECMWF 조합이 실패하면 예전처럼 기본 조합 하나로 받는다
    const blended = fetchJsonCached<OpenMeteoResponse>(buildOpenMeteoUrl(lat, lon, key, elevation, MODELS), 1800)
      .then((j) => {
        const json = blendModels(j);
        if (!json.hourly.temperature_2m?.some((x) => x != null)) throw new Error("모델 조합 응답에 기온이 없음");
        return { json, source: "Open-Meteo (기상청·ECMWF·GFS·ICON)" };
      })
      .catch(() =>
        fetchJsonCached<OpenMeteoResponse>(buildOpenMeteoUrl(lat, lon, key, elevation), 1800).then((json) => ({ json, source: "Open-Meteo" })),
      );
    const [main, marine, air] = await Promise.all([
      blended,
      // 바다 예보 기간이 16일보다 짧은 경우를 대비해 7일로 한 번 더 시도한다
      optional<HourlyOnly<(typeof MARINE)[number]>>(buildMarineUrl(lat, lon, key)).then(
        (m) => m ?? optional<HourlyOnly<(typeof MARINE)[number]>>(buildMarineUrl(lat, lon, key, 7)),
      ),
      optional<HourlyOnly<(typeof AIR)[number]>>(buildAirUrl(lat, lon, key)),
    ]);
    return parseOpenMeteo(main.json, marine, air, main.source);
  },
};
