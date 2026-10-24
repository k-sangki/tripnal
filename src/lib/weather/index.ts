import { cachedJson } from "@/lib/cache";
import { KST_OFFSET_MIN, kstDate } from "@/lib/time";
import { aggregate } from "./aggregate";
import { collectedProvider } from "./collected";
import { mockProvider } from "./mock";
import { openMeteoProvider } from "./openMeteo";
import type { Forecast, WeatherProvider } from "./types";

/**
 * 예보 데이터 공급자. WEATHER_PROVIDER 값만 바꾸면 화면 쪽은 그대로 쓸 수 있다.
 * collected: 직접 수집한 ECMWF·GFS·ICON (R2, 운영), open-meteo: Open-Meteo API (광고 사이트에서는 쓰지 않는다), mock: 개발·테스트
 */
const PROVIDERS: Record<string, WeatherProvider> = {
  "open-meteo": openMeteoProvider,
  mock: mockProvider,
  collected: collectedProvider,
};

/** name: 전환 전 비교용으로 다른 provider를 고를 때 (/api/forecast?provider=collected) */
export function getProvider(name?: string): WeatherProvider {
  return PROVIDERS[name ?? process.env.WEATHER_PROVIDER ?? "collected"] ?? collectedProvider;
}

/** 대한민국(부속 도서 포함) 대략 범위 */
export function isInKorea(lat: number, lon: number): boolean {
  return lat >= 32.8 && lat <= 38.9 && lon >= 124.0 && lon <= 132.0;
}

/** 캐시 효율을 위해 좌표를 약 1km 격자로 맞춘다 */
export function snapCoord(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 배포 버전 (응답 모양이 바뀐 배포 뒤에는 예전 계산 결과를 쓰지 않는다) */
async function deployId(): Promise<string> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = (await getCloudflareContext({ async: true })).env as unknown as { CF_VERSION_METADATA?: { id: string } };
    return env.CF_VERSION_METADATA?.id ?? "dev";
  } catch {
    return "dev";
  }
}

/** 계산한 예보를 보관하는 시간. 원자료 판(run)·날짜가 바뀌면 키가 바뀌므로 길게 둔다 */
const FORECAST_TTL = 6 * 3600;

/**
 * utcOffset: 해외 여행지의 현지 시간대(분). 없으면 한국 시간
 *
 * 예보 계산(격자점 수십 개 보간·모델 중간값)은 요청 하나에 수십 ms가 들어 무료 플랜 CPU 한도(10ms)를 넘으므로,
 * 같은 지점·날짜·원자료 판이면 엣지 캐시에 둔 결과를 쓴다 (페이지·/api/forecast·미리보기 이미지가 같이 씀).
 */
export async function getForecast(lat: number, lon: number, elevation?: number, provider?: string, utcOffset?: number): Promise<Forecast> {
  const p = getProvider(provider);
  const la = snapCoord(lat);
  const lo = snapCoord(lon);
  const compute = async () => aggregate(await p.fetchHourly(la, lo, elevation, utcOffset));
  const version = await p.version?.().catch(() => null);
  if (!version) return compute();
  const day = kstDate(new Date(), utcOffset ?? KST_OFFSET_MIN);
  const key = ["forecast", await deployId(), p.name, `${la}_${lo}`, elevation ?? "", utcOffset ?? "", day, version].join("/");
  return cachedJson(key, FORECAST_TTL, compute);
}

export type { Forecast, DayForecast, Slot } from "./types";
