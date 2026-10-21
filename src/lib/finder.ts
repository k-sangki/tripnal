import { monthRanges } from "@/lib/months";
import type { FinderMonth, FinderRow, SeasonKind } from "@/lib/season";

/**
 * 해외 여행지 찾기 (/overseas/month/{m}) 필터. 조건은 주소(?m=9,10,11&s=peak&g=동남아&f=6...)에 남겨 공유할 수 있다.
 */
export type TempPref = "hot" | "warm" | "cool" | "cold";
export type SortBy = "weather" | "rain" | "near";

export interface FinderQuery {
  months: number[];
  seasons: SeasonKind[];
  groups: string[];
  /** 비행시간 상한(시간) */
  flight: number | null;
  temp: TempPref | null;
  /** 시차 2시간 이내만 */
  nearTz: boolean;
  sort: SortBy;
}

export const SEASON_LABEL: Record<SeasonKind, string> = { peak: "날씨 좋은 때", shoulder: "간절기", off: "비수기" };
export const TEMP_LABEL: Record<TempPref, string> = {
  hot: "더운 곳 (낮 27°C+)",
  warm: "따뜻한 곳 (20~27°C)",
  cool: "선선한 곳 (10~20°C)",
  cold: "추운 곳 (눈 구경)",
};
export const FLIGHTS = [3, 6, 10] as const;
export const SORT_LABEL: Record<SortBy, string> = { weather: "날씨 좋은 순", rain: "비 적은 순", near: "가까운 순" };

export function defaultQuery(month: number): FinderQuery {
  return { months: [month], seasons: ["peak"], groups: [], flight: null, temp: null, nearTz: false, sort: "weather" };
}

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function parseQuery(sp: URLSearchParams, month: number): FinderQuery {
  const q = defaultQuery(month);
  const ms = list(sp.get("m"))
    .map(Number)
    .filter((x) => Number.isInteger(x) && x >= 1 && x <= 12);
  if (ms.length) q.months = [...new Set(ms)].sort((a, b) => a - b);
  const ss = list(sp.get("s")).filter((x): x is SeasonKind => x === "peak" || x === "shoulder" || x === "off");
  if (ss.length) q.seasons = [...new Set(ss)];
  q.groups = list(sp.get("g"));
  const f = Number(sp.get("f"));
  q.flight = (FLIGHTS as readonly number[]).includes(f) ? f : null;
  const t = sp.get("t");
  q.temp = t === "hot" || t === "warm" || t === "cool" || t === "cold" ? t : null;
  q.nearTz = sp.get("tz") === "1";
  const so = sp.get("o");
  q.sort = so === "rain" || so === "near" ? so : "weather";
  return q;
}

export function toSearch(q: FinderQuery, month: number): string {
  const d = defaultQuery(month);
  const p = new URLSearchParams();
  if (q.months.join() !== d.months.join()) p.set("m", q.months.join(","));
  if (q.seasons.join() !== d.seasons.join()) p.set("s", q.seasons.join(","));
  if (q.groups.length) p.set("g", q.groups.join(","));
  if (q.flight) p.set("f", String(q.flight));
  if (q.temp) p.set("t", q.temp);
  if (q.nearTz) p.set("tz", "1");
  if (q.sort !== "weather") p.set("o", q.sort);
  // 쉼표는 그대로 두어 주소를 읽기 쉽게
  const s = p.toString().replace(/%2C/g, ",");
  return s ? `?${s}` : "";
}

function tempOk(hi: number, t: TempPref): boolean {
  if (t === "hot") return hi >= 27;
  if (t === "warm") return hi >= 20 && hi < 27;
  if (t === "cool") return hi >= 10 && hi < 20;
  return hi < 10;
}

export interface FinderResult {
  row: FinderRow;
  /** 조건에 맞는 달 */
  matched: { month: number; m: FinderMonth }[];
  avgScore: number;
  avgRain: number;
}

export function runFinder(rows: FinderRow[], q: FinderQuery): FinderResult[] {
  const out: FinderResult[] = [];
  for (const row of rows) {
    if (q.groups.length && !q.groups.includes(row.group)) continue;
    if (q.flight && row.flight > q.flight) continue;
    if (q.nearTz && Math.abs(row.tz) > 2) continue;
    const matched = q.months
      .map((month) => ({ month, m: row.months[month - 1] }))
      .filter(({ m }) => q.seasons.includes(m.kind) && (!q.temp || tempOk(m.hi, q.temp)));
    if (!matched.length) continue;
    out.push({
      row,
      matched,
      avgScore: matched.reduce((a, x) => a + x.m.score, 0) / matched.length,
      avgRain: matched.reduce((a, x) => a + x.m.rain, 0) / matched.length,
    });
  }
  // 고른 달 중 더 많은 달이 맞는 곳이 먼저
  return out.sort(
    (a, b) =>
      b.matched.length - a.matched.length ||
      (q.sort === "rain" ? a.avgRain - b.avgRain : q.sort === "near" ? a.row.flight - b.row.flight : b.avgScore - a.avgScore),
  );
}

export function monthsLabel(ms: number[]): string {
  return monthRanges(ms);
}

export function finderTitle(q: FinderQuery, count: number): string {
  const when = monthsLabel(q.months);
  const temp = q.temp ? ` ${{ hot: "더운", warm: "따뜻한", cool: "선선한", cold: "추운" }[q.temp]}` : "";
  const where0 = q.groups.length === 1 ? ` ${q.groups[0]}` : q.groups.length > 1 ? ` ${q.groups.join("·")}` : " 해외";
  const where = `${temp}${where0}`;
  const kind =
    q.seasons.length === 1
      ? q.seasons[0] === "peak"
        ? "에 가기 좋은"
        : q.seasons[0] === "shoulder"
          ? " 간절기"
          : " 비수기"
      : "";
  const head = q.seasons.length === 1 && q.seasons[0] === "peak" ? `${when}에 가기 좋은${where}` : `${when}${where}${kind}`;
  return `${head} 여행지 ${count}곳`;
}

/** 빠른 선택 */
export const PRESETS: { id: string; label: string; apply: (q: FinderQuery) => FinderQuery }[] = [
  { id: "winter", label: "🏖️ 겨울 탈출", apply: (q) => ({ ...q, months: [12, 1, 2], seasons: ["peak", "shoulder"], temp: "hot" }) },
  { id: "short", label: "✈️ 2박3일 가까운 곳", apply: (q) => ({ ...q, flight: 3, nearTz: true, seasons: ["peak", "shoulder"] }) },
  { id: "cheap", label: "💸 비수기 가성비", apply: (q) => ({ ...q, seasons: ["off"], temp: null }) },
  { id: "shoulder", label: "🌦️ 간절기 실속", apply: (q) => ({ ...q, seasons: ["shoulder"], temp: null }) },
  { id: "cool", label: "🍁 선선한 날씨", apply: (q) => ({ ...q, seasons: ["peak", "shoulder"], temp: "cool" }) },
];
