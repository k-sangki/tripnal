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

export function buildOpenMeteoUrl(lat: number, lon: number, apiKey?: string, elevation?: number): string {
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

export function parseOpenMeteo(
  json: OpenMeteoResponse,
  marine: HourlyOnly<(typeof MARINE)[number]> | null = null,
  air: HourlyOnly<(typeof AIR)[number]> | null = null,
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
    source: "Open-Meteo",
  };
}

export const openMeteoProvider: WeatherProvider = {
  name: "open-meteo",
  async fetchHourly(lat, lon, elevation) {
    const key = process.env.OPEN_METEO_API_KEY;
    // 바다·대기질은 없어도 기본 예보는 보여준다
    const optional = <T,>(url: string) => fetchJsonCached<T>(url, 1800).catch(() => null);
    const [main, marine, air] = await Promise.all([
      fetchJsonCached<OpenMeteoResponse>(buildOpenMeteoUrl(lat, lon, key, elevation), 1800),
      // 바다 예보 기간이 16일보다 짧은 경우를 대비해 7일로 한 번 더 시도한다
      optional<HourlyOnly<(typeof MARINE)[number]>>(buildMarineUrl(lat, lon, key)).then(
        (m) => m ?? optional<HourlyOnly<(typeof MARINE)[number]>>(buildMarineUrl(lat, lon, key, 7)),
      ),
      optional<HourlyOnly<(typeof AIR)[number]>>(buildAirUrl(lat, lon, key)),
    ]);
    return parseOpenMeteo(main, marine, air);
  },
};
