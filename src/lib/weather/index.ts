import { aggregate } from "./aggregate";
import { collectedProvider } from "./collected";
import { mockProvider } from "./mock";
import { openMeteoProvider } from "./openMeteo";
import type { Forecast, WeatherProvider } from "./types";

/**
 * 예보 데이터 공급자. WEATHER_PROVIDER 값만 바꾸면 화면 쪽은 그대로 쓸 수 있다.
 * collected: 직접 수집한 ECMWF·GFS·ICON (R2), open-meteo: Open-Meteo API
 */
const PROVIDERS: Record<string, WeatherProvider> = {
  "open-meteo": openMeteoProvider,
  mock: mockProvider,
  collected: collectedProvider,
};

/** name: 전환 전 비교용으로 다른 provider를 고를 때 (/api/forecast?provider=collected) */
export function getProvider(name?: string): WeatherProvider {
  return PROVIDERS[name ?? process.env.WEATHER_PROVIDER ?? "open-meteo"] ?? openMeteoProvider;
}

/** 대한민국(부속 도서 포함) 대략 범위 */
export function isInKorea(lat: number, lon: number): boolean {
  return lat >= 32.8 && lat <= 38.9 && lon >= 124.0 && lon <= 132.0;
}

/** 캐시 효율을 위해 좌표를 약 1km 격자로 맞춘다 */
export function snapCoord(v: number): number {
  return Math.round(v * 100) / 100;
}

export async function getForecast(lat: number, lon: number, elevation?: number, provider?: string): Promise<Forecast> {
  const raw = await getProvider(provider).fetchHourly(snapCoord(lat), snapCoord(lon), elevation);
  return aggregate(raw);
}

export type { Forecast, DayForecast, Slot } from "./types";
