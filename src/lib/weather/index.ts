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
  const storeKey = `fc/${day}/${STORE_FORMAT}/${p.name}/${la}_${lo}/${elevation ?? "-"}/${utcOffset ?? "-"}/${version}.json`;
  return cachedJson(key, FORECAST_TTL, () => storedForecast(storeKey, compute));
}

/**
 * 계산한 예보를 R2(fc/{날짜}/…)에도 둔다. 엣지 캐시는 데이터센터마다 따로라서, 방문이 드문 장소 페이지는
 * 검색 로봇이 올 때마다 격자점 파일 40여 개를 새로 읽느라 2~5초가 걸렸다(2026-11-17 측정).
 * 수집이 끝나면 .github/workflows/prewarm.yml이 장소 페이지를 한 번씩 열어 미리 채워 두고,
 * 지난 날짜 폴더는 같은 워크플로가 지운다.
 * aggregate 결과 모양이 바뀌면 STORE_FORMAT을 올린다 (원자료 판이 바뀌면 키가 바뀌므로 길어야 12시간 남는다).
 */
const STORE_FORMAT = "1";

interface StoreBucket {
  get(key: string): Promise<{ json<T>(): Promise<T> } | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

async function storeBucket(): Promise<StoreBucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = (await getCloudflareContext({ async: true })).env as unknown as { DATA?: StoreBucket };
    return env.DATA ?? null;
  } catch {
    return null;
  }
}

export async function storedForecast(key: string, compute: () => Promise<Forecast>, bucket?: StoreBucket | null): Promise<Forecast> {
  const b = bucket === undefined ? await storeBucket() : bucket;
  if (!b) return compute();
  const hit = await b
    .get(key)
    .then((o) => (o ? o.json<Forecast>() : null))
    .catch(() => null);
  if (hit) return hit;
  const value = await compute();
  // 보관에 실패해도 예보는 보여준다
  await b.put(key, JSON.stringify(value), { httpMetadata: { contentType: "application/json" } }).catch(() => null);
  return value;
}

export type { Forecast, DayForecast, Slot } from "./types";
