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
] as const;

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation?: number;
  hourly: Record<(typeof HOURLY)[number] | "time", (number | null)[] | string[]>;
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

export function parseOpenMeteo(json: OpenMeteoResponse): RawForecast {
  const h = json.hourly;
  const nums = (k: (typeof HOURLY)[number]) => (h[k] as (number | null)[]) ?? [];
  const hourly: HourlySeries = {
    time: h.time as string[],
    temperature: nums("temperature_2m"),
    apparentTemperature: nums("apparent_temperature"),
    precipitation: nums("precipitation"),
    precipitationProbability: nums("precipitation_probability"),
    cloudCover: nums("cloud_cover"),
    windSpeed: nums("wind_speed_10m"),
    windGusts: nums("wind_gusts_10m"),
    windDirection: nums("wind_direction_10m"),
    weatherCode: nums("weather_code"),
  };
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
    const url = buildOpenMeteoUrl(lat, lon, process.env.OPEN_METEO_API_KEY, elevation);
    return parseOpenMeteo(await fetchJsonCached<OpenMeteoResponse>(url, 1800));
  },
};
