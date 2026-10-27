import { PLACES, type Place } from "@/lib/places";
import { addDays, diffDays } from "@/lib/time";
import { getForecast } from "@/lib/weather";
import { weekendFromForecast, type WeekendDay } from "@/lib/weekend";

/**
 * 계절 검색어 페이지 (/first-snow 첫눈, /ski 스키장, /autumn-foliage 단풍, /kimjang 김장).
 * 수집 작업(collector/weekend.py)이 R2 weekend/days.json에 올리는 장소별 하루 요약(앞으로 약 2주)을 쓴다.
 */
export interface DaysData {
  generated: string;
  places: Record<string, WeekendDay[]>;
}

/** 첫눈·김장에 쓰는 도시 (시청 부근 좌표) */
export const SEASON_CITIES = [
  "seoul", "incheon", "suwon", "chuncheon", "wonju", "gangneung", "cheongju", "cheonan", "sejong", "daejeon",
  "andong", "daegu", "gyeongju", "ulsan", "busan", "changwon", "jeonju", "gwangju", "suncheon", "jeju",
];

/**
 * 기상청 유명산 평년 단풍 절정일 (월-일). 해마다 같은 날을 기준으로 쓴다.
 * 출처: 기상청 유명산 단풍 평년값 (아이뉴스24 2026-10-12 정리 기사)
 */
export const FOLIAGE_PEAK: Record<string, string> = {
  "odaesan-birobong": "10-15",
  "seoraksan-daecheongbong": "10-17",
  "sobaeksan-birobong": "10-20",
  "chiaksan-birobong": "10-21",
  "jirisan-cheonwangbong": "10-23",
  woraksan: "10-24",
  songnisan: "10-26",
  gyeryongsan: "10-27",
  juwangsan: "10-27",
  "bukhansan-baegundae": "10-28",
  palgongsan: "10-28",
  hallasan: "10-28",
  geumosan: "10-28",
  gayasan: "10-28",
  gajisan: "10-31",
  mudeungsan: "11-04",
  naejangsan: "11-04",
  wolchulsan: "11-06",
  "dalmasan-duryunsan": "11-10",
};

export function place(slug: string): Place | undefined {
  return PLACES.find((p) => p.slug === slug);
}

/** 날씨 코드가 눈(진눈깨비 포함)인지: 눈 71~77, 눈 소나기 85·86 */
export function isSnow(code: number | null): boolean {
  return code != null && ((code >= 71 && code <= 77) || code === 85 || code === 86);
}

/** 오늘 이후 날만 (자료가 하루 두 번 올라와 어제 날이 섞일 수 있다) */
export function upcoming(days: WeekendDay[] | undefined, today: string): WeekendDay[] {
  return (days ?? []).filter((d) => d.date >= today);
}

function minOf(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? Math.min(...v) : null;
}

export interface SnowRow {
  place: Place;
  /** 처음 눈 예보가 있는 날 */
  snow: string | null;
  /** 처음 영하로 내려가는 날 */
  freeze: string | null;
  tMin: number | null;
}

export function snowRows(data: DaysData, slugs: string[], today: string): SnowRow[] {
  return slugs
    .flatMap((slug) => {
      const p = place(slug);
      const days = upcoming(data.places[slug], today);
      if (!p || !days.length) return [];
      return [
        {
          place: p,
          snow: days.find((d) => isSnow(d.code))?.date ?? null,
          freeze: days.find((d) => d.tMin != null && d.tMin < 0)?.date ?? null,
          tMin: minOf(days.map((d) => d.tMin)),
        },
      ];
    })
    .sort((a, b) => (a.snow ?? "9").localeCompare(b.snow ?? "9") || (a.tMin ?? 99) - (b.tMin ?? 99));
}

/** 인공 눈을 만들 수 있는 밤의 기준 (보통 영하 3도 이하, 습도가 낮을수록 잘 만들어진다) */
export const SNOWMAKING_C = -3;

export interface SkiRow {
  place: Place;
  /** 최저기온이 SNOWMAKING_C 이하인 날 수 */
  nights: number;
  /** 처음 그런 날 */
  firstNight: string | null;
  snow: string | null;
  snowDays: number;
  tMin: number | null;
  total: number;
}

export function skiRows(data: DaysData, today: string): SkiRow[] {
  return PLACES.filter((p) => p.leisure === "ski")
    .flatMap((p) => {
      const days = upcoming(data.places[p.slug], today);
      if (!days.length) return [];
      const cold = days.filter((d) => d.tMin != null && d.tMin <= SNOWMAKING_C);
      return [
        {
          place: p,
          nights: cold.length,
          firstNight: cold[0]?.date ?? null,
          snow: days.find((d) => isSnow(d.code))?.date ?? null,
          snowDays: days.filter((d) => isSnow(d.code)).length,
          tMin: minOf(days.map((d) => d.tMin)),
          total: days.length,
        },
      ];
    })
    .sort((a, b) => b.nights - a.nights || b.snowDays - a.snowDays || (a.tMin ?? 99) - (b.tMin ?? 99));
}

/** 기상청 김장 적기 기준: 하루 평균기온 4도 이하, 최저기온 0도 이하 */
export function kimjangDay(d: WeekendDay): boolean {
  return d.tMin != null && d.tMax != null && d.tMin <= 0 && (d.tMin + d.tMax) / 2 <= 4;
}

export interface KimjangRow {
  place: Place;
  /** 처음 기준을 만족하는 날 */
  first: string | null;
  /** 가장 추운 날의 평균기온 */
  coldestMean: number | null;
  tMin: number | null;
}

export function kimjangRows(data: DaysData, today: string): KimjangRow[] {
  return SEASON_CITIES.flatMap((slug) => {
    const p = place(slug);
    const days = upcoming(data.places[slug], today);
    if (!p || !days.length) return [];
    const means = days.filter((d) => d.tMin != null && d.tMax != null).map((d) => (d.tMin! + d.tMax!) / 2);
    return [
      {
        place: p,
        first: days.find(kimjangDay)?.date ?? null,
        coldestMean: means.length ? Math.round(Math.min(...means) * 10) / 10 : null,
        tMin: minOf(days.map((d) => d.tMin)),
      },
    ];
  }).sort((a, b) => (a.first ?? "9").localeCompare(b.first ?? "9") || (a.coldestMean ?? 99) - (b.coldestMean ?? 99));
}

export type FoliageStatus = "peak" | "soon" | "later" | "past";

export interface FoliageRow {
  place: Place;
  /** 올해(또는 다가오는 해)의 평년 절정일 */
  peak: string;
  status: FoliageStatus;
}

/**
 * ref(보통 이번 주말 첫날) 기준으로 절정 닷새 전부터 절정 뒤 일주일까지는 "절정 무렵", 절정 2주 전부터는 "곧 절정", 그 뒤는 "지났어요".
 * 단풍철(9~11월)이 아니면 모두 "아직"으로 다음 가을 날짜를 보여 준다.
 */
export function foliageRows(ref: string): FoliageRow[] {
  const year = ref.slice(0, 4);
  const month = Number(ref.slice(5, 7));
  return Object.entries(FOLIAGE_PEAK)
    .flatMap(([slug, md]) => {
      const p = place(slug);
      if (!p) return [];
      const peak = `${month === 12 ? Number(year) + 1 : year}-${md}`;
      const d = diffDays(ref, peak); // 양수면 절정이 남음
      const status: FoliageStatus = month < 9 || month === 12 ? "later" : d < -7 ? "past" : d <= 5 ? "peak" : d <= 14 ? "soon" : "later";
      return [{ place: p, peak, status }];
    })
    .sort((a, b) => a.peak.localeCompare(b.peak));
}

/** R2 자료. 바인딩이 없는 개발 환경에서는 null */
export async function loadDays(): Promise<DaysData | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = (await getCloudflareContext({ async: true })).env as unknown as {
      DATA?: { get(key: string): Promise<{ json<T>(): Promise<T> } | null> };
    };
    const o = await env.DATA?.get("weekend/days.json");
    return o ? await o.json<DaysData>() : null;
  } catch {
    return null;
  }
}

/** 개발 환경(R2 없음)에서는 필요한 장소만 예보를 직접 받아 같은 모양으로 만든다 */
export async function devDays(slugs: string[], today: string): Promise<DaysData> {
  const dates = Array.from({ length: 15 }, (_, i) => addDays(today, i));
  const places: DaysData["places"] = {};
  await Promise.all(
    slugs.map(async (slug) => {
      const p = place(slug);
      if (!p) return;
      const f = await getForecast(p.lat, p.lon, p.elevation);
      const s = weekendFromForecast(f, dates.filter((d) => f.days.some((x) => x.date === d)));
      if (s) places[slug] = s;
    }),
  );
  return { generated: new Date().toISOString(), places };
}

/** 운영은 R2, 개발은 직접 계산 */
export async function seasonDays(slugs: string[], today: string): Promise<DaysData | null> {
  const data = await loadDays();
  if (data || process.env.NODE_ENV !== "development") return data;
  return devDays(slugs, today);
}

/** 계절 페이지 사이 링크와 장소 목록(/weather) 위 링크 */
export const SEASON_PAGES = [
  { href: "/autumn-foliage", label: "🍁 단풍 절정" },
  { href: "/first-snow", label: "🌨️ 첫눈 예보" },
  { href: "/ski", label: "⛷️ 스키장 날씨" },
  { href: "/kimjang", label: "🥬 김장 날씨" },
];
