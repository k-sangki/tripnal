import { getNormals, goodMonths, monthScore, stormSeason, type MonthNormal } from "@/lib/climate";
import { flightHours } from "@/lib/countryInfo";
import type { Destination } from "@/lib/overseas";
import { tzOffsetMin } from "@/lib/time";

/**
 * 해외 여행지의 달별 시즌: 날씨 좋은 때(성수기) · 간절기 · 비수기.
 * 평년값(climate.json)으로 정한다. 가격 자료는 없으므로 "싸다"고 단정하지 않는다.
 */
export type SeasonKind = "peak" | "shoulder" | "off";

export interface MonthSeason {
  kind: SeasonKind;
  /** 간절기·비수기 이유 한 줄 (성수기는 계절 행사 이름만) */
  reason?: string;
  /** 태풍·허리케인·사이클론 시기 */
  storm?: string;
}

const prevM = (m: number) => ((m + 10) % 12) + 1;
const nextM = (m: number) => (m % 12) + 1;

function offReason(n: MonthNormal, tropical: boolean): string {
  if (n.rain >= 150) return tropical ? "우기" : "비가 많은 시기";
  if (n.hi >= 31) return "무더위";
  if (n.hi < 6) return "한겨울 추위";
  if (n.hi < 12) return "쌀쌀한 날씨";
  if (n.hi >= 26 && n.hum >= 75) return "후덥지근한 날씨";
  return "날씨가 아쉬운 시기";
}

/** 간절기 이유: 좋은 달과 비교해 비·기온이 어느 쪽으로 바뀌는 때인지 */
function shoulderReason(n: MonthNormal, good: MonthNormal, goodMonth: number, entering: boolean, tropical: boolean): string {
  const wetter = n.rain >= 100 && n.rain > good.rain * 1.3;
  if (wetter) {
    if (tropical) return entering ? `우기 끝물 · ${goodMonth}월부터 건기` : "건기 → 우기, 우기 시작 무렵";
    return entering ? `비 많은 시기 끝물 · ${goodMonth}월부터 맑은 날 많음` : "비가 늘기 시작하는 때";
  }
  if (n.hi > good.hi + 2) return entering ? "더위 끝물" : "더위 시작 무렵";
  if (n.hi < good.hi - 2) return entering ? "추위 끝물" : "쌀쌀해지기 시작하는 때";
  return entering ? "성수기 직전" : "성수기 직후";
}

/** 12달 시즌 */
export function seasons(d: Destination): MonthSeason[] | null {
  const normals = getNormals(d.slug);
  if (!normals) return null;
  const good = new Map(goodMonths(d.slug).map((g) => [g.month, g]));
  const tropical = Math.abs(d.lat) < 25;
  const storm = stormSeason(d);
  // 열대처럼 1년 내내 점수가 낮은 곳도 있어 간절기는 그곳의 가장 좋은 달과 비교한다
  const best = Math.max(...normals.map(monthScore));
  return normals.map((n, i) => {
    const m = i + 1;
    const s = storm?.months.includes(m) ? storm.name : undefined;
    const g = good.get(m);
    if (g) return { kind: "peak", reason: g.reason, storm: s };
    // 좋은 달 바로 앞(좋은 시기로 들어가는 때)인지 뒤(빠져나가는 때)인지
    const into = good.has(nextM(m)) ? nextM(m) : null;
    const outOf = good.has(prevM(m)) ? prevM(m) : null;
    if ((into || outOf) && monthScore(n) >= best - 7) {
      const gm = (into ?? outOf)!;
      return { kind: "shoulder", reason: shoulderReason(n, normals[gm - 1], gm, into != null, tropical), storm: s };
    }
    return { kind: "off", reason: offReason(n, tropical), storm: s };
  });
}

/* ---------- 여행지 찾기 화면에 넘기는 자료 ---------- */

/** 서울 평년값 (기상청 1991~2020 평년, 낮 최고·아침 최저 °C). "서울보다 몇 도" 비교용 */
export const SEOUL_HI = [1.6, 4.6, 10.6, 17.6, 23.2, 27.4, 29.0, 29.8, 25.9, 20.0, 11.6, 3.4];

export interface FinderMonth {
  hi: number;
  lo: number;
  rain: number;
  /** 날씨 점수 (정렬용) */
  score: number;
  kind: SeasonKind;
  reason?: string;
  storm?: string;
}

export interface FinderRow {
  slug: string;
  name: string;
  country: string;
  group: string;
  /** 인천에서 어림한 비행시간 */
  flight: number;
  /** 한국과의 시차(시간, 현지가 늦으면 음수) */
  tz: number;
  months: FinderMonth[];
}

export function finderRows(list: Destination[], now: Date = new Date()): FinderRow[] {
  const out: FinderRow[] = [];
  for (const d of list) {
    const normals = getNormals(d.slug);
    const ss = seasons(d);
    if (!normals || !ss) continue;
    out.push({
      slug: d.slug,
      name: d.name,
      country: d.country,
      group: d.group,
      flight: flightHours(d),
      tz: (tzOffsetMin(d.tz, now) - 540) / 60,
      months: normals.map((n, i) => ({
        hi: Math.round(n.hi),
        lo: Math.round(n.lo),
        rain: Math.round(n.rain),
        score: Math.round(monthScore(n) * 10) / 10,
        ...ss[i],
      })),
    });
  }
  return out;
}
