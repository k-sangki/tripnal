import type { Forecast } from "@/lib/weather/types";

/** 응답 모양이 바뀔 때 올려서 브라우저·엣지에 남은 예전 응답을 쓰지 않게 한다 */
export const FORECAST_VERSION = "6";

export function forecastUrl(p: { lat: number; lon: number; elevation?: number }): string {
  const q = new URLSearchParams({ lat: String(p.lat), lon: String(p.lon), v: FORECAST_VERSION });
  if (p.elevation != null) q.set("elev", String(p.elevation));
  return `/api/forecast?${q}`;
}

/** 브라우저에서 예보 받기 (내 장소 띠·가까운 대안처럼 곁다리로 쓰는 곳) */
export async function fetchForecast(p: { lat: number; lon: number; elevation?: number }, signal?: AbortSignal): Promise<Forecast> {
  const res = await fetch(forecastUrl(p), { signal });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Forecast;
}
