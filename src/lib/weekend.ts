import type { LeisureId } from "@/lib/leisure";
import { PLACES, type Place } from "@/lib/places";
import type { Forecast } from "@/lib/weather/types";

/**
 * "이번 주말 날씨 좋은 곳" (/weekend).
 * 수집 작업(collector/weekend.py)이 장소마다 주말 예보 요약을 R2 weekend/latest.json에 올리고, 점수는 여기서 매긴다.
 */
export interface WeekendDay {
  date: string;
  tMin: number | null;
  tMax: number | null;
  rain: number | null;
  prob: number | null;
  wind: number | null;
  gust: number | null;
  code: number | null;
}

export interface WeekendData {
  generated: string;
  dates: string[];
  places: Record<string, WeekendDay[]>;
}

export interface WeekendPick {
  place: Place;
  score: number;
  days: WeekendDay[];
  tMin: number | null;
  tMax: number | null;
  rain: number;
  gust: number | null;
  code: number | null;
}

/**
 * 주말 날씨 점수 (10점 만점). 비·바람·더위·추위·흐림으로 뺀다.
 * 낚시·자전거는 바람에 더 민감하고, 캠핑은 밤 추위를 더 크게 본다. 스키장은 추위를 빼지 않고 눈을 반긴다.
 */
export function weekendScore(days: WeekendDay[], leisure: LeisureId): number {
  let s = 10;
  const rain = days.reduce((a, d) => a + (d.rain ?? 0), 0);
  const prob = Math.max(0, ...days.map((d) => d.prob ?? 0));
  const gust = Math.max(0, ...days.map((d) => d.gust ?? 0));
  const hi = Math.max(...days.map((d) => d.tMax ?? -99));
  const lo = Math.min(...days.map((d) => d.tMin ?? 99));
  const snow = days.some((d) => d.code != null && d.code >= 71 && d.code <= 86);

  if (!(leisure === "ski" && snow)) s -= Math.min(5, rain * 0.8) + (prob >= 60 ? 2 : prob >= 40 ? 1 : 0);
  s -= Math.max(0, gust - (leisure === "fishing" || leisure === "cycling" ? 6 : 8)) * 0.35;
  if (hi > 28) s -= (hi - 28) * 0.4;
  if (leisure !== "ski") {
    if (hi < 15) s -= (15 - hi) * 0.25;
    if (lo < 0) s -= -lo * (leisure === "camping" ? 0.3 : 0.15);
  }
  s -= days.filter((d) => d.code === 3 || d.code === 45 || d.code === 48).length * 0.3;
  return Math.max(0, Math.min(10, Math.round(s * 10) / 10));
}

/** 대표 날씨 코드: 가장 나쁜(숫자가 큰) 날 기준 */
function worstCode(days: WeekendDay[]): number | null {
  const codes = days.map((d) => d.code).filter((c): c is number => c != null);
  return codes.length ? Math.max(...codes) : null;
}

export function rankWeekend(data: WeekendData, leisure: LeisureId, limit = 8): WeekendPick[] {
  return PLACES.filter((p) => p.leisure === leisure && data.places[p.slug]?.length)
    .map((place) => {
      const days = data.places[place.slug];
      const lows = days.map((d) => d.tMin).filter((x): x is number => x != null);
      const highs = days.map((d) => d.tMax).filter((x): x is number => x != null);
      const gusts = days.map((d) => d.gust).filter((x): x is number => x != null);
      return {
        place,
        score: weekendScore(days, leisure),
        days,
        tMin: lows.length ? Math.min(...lows) : null,
        tMax: highs.length ? Math.max(...highs) : null,
        rain: Math.round(days.reduce((a, d) => a + (d.rain ?? 0), 0) * 10) / 10,
        gust: gusts.length ? Math.max(...gusts) : null,
        code: worstCode(days),
      };
    })
    .sort((a, b) => b.score - a.score || a.rain - b.rain)
    .slice(0, limit);
}

/** 검색 설명에 넣을 레저별 주말 날씨 1등 ("캠핑장 ○○·산 ○○·바다낚시 ○○") */
const BEST_LABEL: [LeisureId, string][] = [
  ["camping", "캠핑장"],
  ["hiking", "산"],
  ["fishing", "바다낚시"],
];

/**
 * 이번 주말 1등 장소를 한 줄로. 지난 주말 자료면 null.
 * 날짜 범위("10/31~11/1")와 함께 돌려준다.
 */
export function weekendBest(data: WeekendData | null, today: string): { range: string; best: string } | null {
  if (!data || !data.dates.length || data.dates[data.dates.length - 1] < today) return null;
  const best = BEST_LABEL.map(([id, label]) => {
    const top = rankWeekend(data, id, 1)[0];
    return top ? `${label} ${top.place.name}` : null;
  }).filter(Boolean);
  if (!best.length) return null;
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const range = data.dates.length > 1 ? `${md(data.dates[0])}~${md(data.dates[data.dates.length - 1])}` : md(data.dates[0]);
  return { range, best: best.join("·") };
}

/** 예보 하나에서 주말 요약 만들기 (개발용 대체 경로: R2가 없을 때) */
export function weekendFromForecast(f: Forecast, dates: string[]): WeekendDay[] | null {
  const out: WeekendDay[] = [];
  for (const date of dates) {
    const d = f.days.find((x) => x.date === date);
    if (!d) return null;
    out.push({ date, tMin: d.tMin, tMax: d.tMax, rain: d.precipSum, prob: d.precipProbMax, wind: d.windMax, gust: d.gustMax, code: d.code });
  }
  return out;
}

/** R2에서 읽는다. 바인딩이 없는 개발 환경에서는 null */
export async function loadWeekend(): Promise<WeekendData | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = (await getCloudflareContext({ async: true })).env as unknown as {
      DATA?: { get(key: string): Promise<{ json<T>(): Promise<T> } | null> };
    };
    const o = await env.DATA?.get("weekend/latest.json");
    return o ? await o.json<WeekendData>() : null;
  } catch {
    return null;
  }
}
