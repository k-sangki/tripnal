import climate from "@/data/climate.json";
import intro from "@/data/overseas-intro.json";
import type { Destination } from "@/lib/overseas";
import type { Forecast } from "@/lib/weather/types";

/**
 * 해외 여행지의 평년 월별 날씨(NASA POWER 2001~2020 일별 자료로 만든 값, collector/climate.py)와
 * 그 값으로 정하는 여행하기 좋은 달·옷차림·주의할 점·준비물.
 */
export interface MonthNormal {
  /** 일 최고·최저 기온 평균 °C */
  hi: number;
  lo: number;
  /** 월 강수량 mm */
  rain: number;
  /** 1mm 이상 비(눈) 온 날 수 */
  rainDays: number;
  /** 상대습도 % */
  hum: number;
}

const PLACES = (climate as { places: Record<string, { months: MonthNormal[] }> }).places;
const INTRO = intro as Record<string, string>;

export const CLIMATE_SOURCE = "NASA POWER 2001~2020년 일별 자료";

export function getNormals(slug: string): MonthNormal[] | undefined {
  return PLACES[slug]?.months;
}

export function getIntro(slug: string): string | undefined {
  return INTRO[slug];
}

/** 날씨 값만으로는 안 나오는 계절 행사(눈축제·오로라 등)로 좋은 달 */
const SEASONAL: Record<string, { months: number[]; reason: string }> = {
  sapporo: { months: [2], reason: "눈축제" },
  harbin: { months: [1, 2], reason: "빙설제" },
  rovaniemi: { months: [12, 1, 2, 3], reason: "오로라·설경" },
  yellowknife: { months: [12, 1, 2, 3], reason: "오로라" },
};

/** 날씨가 여행하기에 얼마나 편한지 (10점 만점, 낮 기온·비·후덥지근함으로 뺀다) */
export function monthScore(m: MonthNormal): number {
  const temp = Math.max(0, m.hi - 26) * 0.9 + Math.max(0, 18 - m.hi) * 0.6 + Math.max(0, 5 - m.lo) * 0.2;
  const rain = Math.max(0, m.rain - 120) / 60 + Math.max(0, m.rainDays - 10) * 0.25;
  const muggy = m.hi >= 26 && m.hum >= 70 ? ((m.hum - 70) / 10) * ((m.hi - 25) / 3) : 0;
  return 10 - temp - rain - muggy;
}

export interface GoodMonth {
  month: number;
  reason?: string;
}

/**
 * 여행하기 좋은 달(1~12). 점수 8점 이상 중 높은 순 6달까지.
 * 열대처럼 8점을 넘는 달이 거의 없는 곳은 그중 나은 달(최고점에서 2점 안, 2~4달)을 고른다.
 */
export function goodMonths(slug: string): GoodMonth[] {
  const months = getNormals(slug);
  if (!months) return [];
  const scored = months.map((m, i) => ({ month: i + 1, s: monthScore(m) })).sort((a, b) => b.s - a.s);
  let picked = scored.filter((x) => x.s >= 8).slice(0, 6);
  if (picked.length < 2) {
    const best = scored[0].s;
    picked = scored.filter((x, i) => i < 2 || (x.s >= best - 2 && i < 4));
  }
  const out = new Map<number, GoodMonth>(picked.map((x) => [x.month, { month: x.month }]));
  const extra = SEASONAL[slug];
  if (extra) for (const m of extra.months) out.set(m, { month: m, reason: extra.reason });
  return [...out.values()].sort((a, b) => a.month - b.month);
}

/** [3,4,5,10,11] → "3~5월, 10~11월" (12월→1월로 이어지는 것도 한 묶음) */
export function monthRanges(list: number[]): string {
  const set = new Set(list);
  if (set.size === 12) return "1년 내내";
  if (!set.size) return "";
  // 비어 있는 달 다음부터 돌면 해를 넘기는 묶음도 끊기지 않는다
  let start = 1;
  while (set.has(start)) start++;
  const runs: number[][] = [];
  for (let k = 0; k < 12; k++) {
    const m = ((start - 1 + k) % 12) + 1;
    if (!set.has(m)) continue;
    const last = runs[runs.length - 1];
    const prev = ((m + 10) % 12) + 1;
    if (last && last[last.length - 1] === prev) last.push(m);
    else runs.push([m]);
  }
  runs.sort((a, b) => a[0] - b[0]);
  return runs.map((r) => (r.length === 1 ? `${r[0]}월` : `${r[0]}~${r[r.length - 1]}월`)).join(", ");
}

/** 태풍·허리케인·사이클론이 올 수 있는 달 (대략적인 지역·계절) */
export function stormSeason(d: Pick<Destination, "lat" | "lon">): { name: string; months: number[] } | null {
  const { lat, lon } = d;
  if (lat >= 5 && lat <= 42 && lon >= 100 && lon <= 150) return { name: "태풍", months: lat < 18 ? [7, 8, 9, 10, 11] : [7, 8, 9, 10] };
  if (lat >= 12 && lat <= 32 && lon >= -100 && lon <= -60) return { name: "허리케인", months: [8, 9, 10] };
  if (lat >= -25 && lat <= -10 && lon >= 110 && lon <= 180) return { name: "사이클론", months: [1, 2, 3] };
  return null;
}

/** 도시 카드에 쓰는 기후 특징 몇 줄 */
export function climateSummary(d: Destination): string[] {
  const months = getNormals(d.slug);
  if (!months) return [];
  const his = months.map((m) => m.hi);
  const los = months.map((m) => m.lo);
  const maxHi = Math.max(...his);
  const minHi = Math.min(...his);
  const minLo = Math.min(...los);
  const hot = his.indexOf(maxHi) + 1;
  const cold = los.indexOf(minLo) + 1;
  const total = months.reduce((s, m) => s + m.rain, 0);
  const lines: string[] = [];

  if (minHi >= 27) lines.push(`1년 내내 낮 기온이 27°C를 넘는 더운 곳이에요.`);
  else if (maxHi - minHi <= 9 && minHi >= 14) lines.push(`1년 내내 기온 차이가 작아 온화해요 (낮 ${Math.round(minHi)}~${Math.round(maxHi)}°C).`);
  else if (minLo <= -15) lines.push(`겨울이 매우 추워요. ${cold}월 아침 평균 ${Math.round(minLo)}°C, ${hot}월 낮 평균 ${Math.round(maxHi)}°C예요.`);
  else lines.push(`가장 더운 ${hot}월 낮 평균 ${Math.round(maxHi)}°C, 가장 추운 ${cold}월 아침 평균 ${Math.round(minLo)}°C예요.`);

  if (d.lat < 0) lines.push("남반구라 한국과 계절이 반대예요.");
  if (d.elevation >= 1500) lines.push(`해발 약 ${d.elevation.toLocaleString("ko-KR")}m 고지대라 햇볕이 강하고 아침저녁이 쌀쌀해요.`);

  const wet = months.map((m, i) => (m.rain >= 150 ? i + 1 : 0)).filter(Boolean);
  const dry = months.map((m, i) => (m.rain <= 30 ? i + 1 : 0)).filter(Boolean);
  if (total < 200) lines.push("비가 거의 오지 않는 건조한 곳이에요.");
  else if (wet.length && wet.length < 12) lines.push(`${monthRanges(wet)}은 비가 많은 시기예요.${dry.length >= 3 ? ` ${monthRanges(dry)}은 건기예요.` : ""}`);
  else if (wet.length === 12) lines.push("1년 내내 비가 자주 내려요.");

  const storm = stormSeason(d);
  if (storm) lines.push(`${monthRanges(storm.months)}에는 ${storm.name} 영향을 받을 수 있어요.`);
  return lines;
}

/* ---------- 달별 여행 가이드 ---------- */

const CLOTHES: [number, string][] = [
  [28, "민소매·반팔, 반바지, 린넨 옷"],
  [23, "반팔, 얇은 셔츠, 면바지"],
  [20, "긴팔 티셔츠, 얇은 가디건"],
  [17, "얇은 니트, 맨투맨, 가디건"],
  [12, "자켓, 가디건, 청바지"],
  [9, "트렌치코트, 야상, 니트"],
  [5, "코트, 가죽자켓, 히트텍"],
  [-5, "패딩, 두꺼운 코트, 목도리"],
  [-Infinity, "롱패딩, 방한 내의, 방한화, 귀마개"],
];

export function clothesFor(t: number): string {
  return CLOTHES.find(([min]) => t >= min)![1];
}

export interface MonthGuide {
  /** 낮·아침저녁 옷차림 */
  day: string;
  night: string;
  cautions: string[];
  packing: string[];
  good: string[];
  bad: string[];
}

export function monthGuide(d: Destination, month: number): MonthGuide | null {
  const m = getNormals(d.slug)?.[month - 1];
  if (!m) return null;
  const tropical = Math.abs(d.lat) < 24;
  const summer = d.lat >= 0 ? month >= 5 && month <= 8 : month <= 2 || month >= 11;
  const range = m.hi - m.lo;
  const storm = stormSeason(d);
  const stormNow = storm?.months.includes(month);
  const rainy = m.rain >= 150 || m.rainDays >= 15;
  const muggy = m.hi >= 26 && m.hum >= 75;
  const cautions: string[] = [];
  const packing = new Set<string>();
  const good: string[] = [];
  const bad: string[] = [];

  if (m.hi >= 33) {
    cautions.push(`낮 평균 ${Math.round(m.hi)}°C로 매우 더워요. 한낮 야외 일정은 줄이고 물을 자주 마셔요.`);
    bad.push("한낮 더위");
  } else if (m.hi >= 29) {
    cautions.push("한낮에는 덥고 햇볕이 강해요. 그늘과 실내 일정을 섞어 짜요.");
  }
  if (muggy) {
    cautions.push(`습도가 ${m.hum}% 안팎으로 후덥지근해요.`);
    bad.push("높은 습도");
    packing.add("빨리 마르는 옷");
  }
  if (m.lo <= -10) {
    cautions.push(`아침 평균 ${Math.round(m.lo)}°C의 혹한이에요. 노출된 피부는 동상에 주의해요.`);
    bad.push("혹한");
    ["핫팩", "장갑", "목도리", "방한화"].forEach((x) => packing.add(x));
  } else if (m.lo <= 0) {
    cautions.push("아침저녁 영하로 내려가 길이 얼 수 있어요.");
    ["핫팩", "장갑"].forEach((x) => packing.add(x));
  }
  if (range >= 10) {
    cautions.push(`일교차가 ${Math.round(range)}°C 안팎으로 커요. 아침저녁엔 겉옷이 필요해요.`);
    packing.add("걸칠 겉옷");
  }
  if (rainy) {
    cautions.push(tropical ? "비가 잦은 우기예요. 대부분 짧고 굵은 소나기라 일정을 넉넉히 잡아요." : `한 달 비가 ${m.rain}mm 안팎으로 많은 편이에요.`);
    bad.push(tropical ? "우기 소나기" : "잦은 비");
    ["우산", "방수 신발"].forEach((x) => packing.add(x));
  } else if (m.rainDays >= 10) {
    packing.add("접이식 우산");
  }
  if (stormNow) {
    cautions.push(`${storm!.name} 영향을 받을 수 있는 시기예요. 출발 전 항공·배편 소식을 확인해요.`);
    bad.push(`${storm!.name} 가능성`);
  }
  if (d.elevation >= 2500) {
    cautions.push(`해발 ${d.elevation.toLocaleString("ko-KR")}m 고지대라 고산병이 올 수 있어요. 첫날은 천천히 움직여요.`);
    packing.add("고산병 약");
  }
  if (tropical || (summer && m.hi >= 25) || d.elevation >= 2000) {
    ["선크림", "선글라스", "모자"].forEach((x) => packing.add(x));
  }
  if (m.hi >= 28) {
    packing.add("휴대용 선풍기");
    packing.add("물병");
  }
  if (tropical && m.hi >= 28) packing.add("실내 냉방용 얇은 가디건");
  if (m.hum <= 50 || m.hi <= 5) packing.add("보습 크림·립밤");

  const score = monthScore(m);
  if (m.hi >= 18 && m.hi <= 27) good.push("걷기 좋은 기온");
  if (m.rainDays <= 7 && m.rain <= 60) good.push("비가 적어 야외 일정이 편함");
  if (tropical && m.hi >= 28 && !rainy) good.push("물놀이하기 좋은 날씨");
  if (m.hi < 8) bad.push("추위");
  const extra = SEASONAL[d.slug];
  if (extra?.months.includes(month)) good.push(extra.reason);
  if (!good.length && score >= 7) good.push("무난한 날씨");

  return {
    day: clothesFor(m.hi),
    night: clothesFor(m.lo),
    cautions,
    packing: [...packing],
    good,
    bad,
  };
}

/* ---------- 최근 날씨 이슈 (16일 예보를 평년과 비교) ---------- */

export interface WeatherIssue {
  kind: "heat" | "cold" | "rain" | "wind" | "snow";
  label: string;
  text: string;
}

const dayLabel = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  const w = "일월화수목금토"[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return `${m}/${d}(${w})`;
};

/** 앞으로 16일 예보에서 평년과 크게 다른 날씨(폭염·한파·폭우·강풍·폭설)를 찾는다 */
export function weatherIssues(d: Destination, f: Forecast): WeatherIssue[] {
  const normals = getNormals(d.slug);
  if (!normals) return [];
  const found = new Map<WeatherIssue["kind"], { date: string; value: number }>();
  const keep = (kind: WeatherIssue["kind"], date: string, value: number, worse: (a: number, b: number) => boolean) => {
    const cur = found.get(kind);
    if (!cur || worse(value, cur.value)) found.set(kind, { date, value });
  };
  for (const day of f.days) {
    const n = normals[Number(day.date.slice(5, 7)) - 1];
    if (day.tMax != null && ((day.tMax >= 35 && day.tMax >= n.hi + 2) || day.tMax >= 42 || (day.tMax >= 28 && day.tMax >= n.hi + 6)))
      keep("heat", day.date, day.tMax, (a, b) => a > b);
    if (day.tMin != null && day.tMin <= n.lo - 6 && day.tMin <= 5) keep("cold", day.date, day.tMin, (a, b) => a < b);
    if (day.precipSum >= 50 || (day.precipSum >= 30 && n.rain < 100)) keep("rain", day.date, day.precipSum, (a, b) => a > b);
    if (day.gustMax != null && day.gustMax >= 20) keep("wind", day.date, day.gustMax, (a, b) => a > b);
    const snow = day.slots.reduce((s, x) => s + (x.snow ?? 0), 0);
    if (snow >= 10) keep("snow", day.date, snow, (a, b) => a > b);
  }
  const out: WeatherIssue[] = [];
  const h = found.get("heat");
  if (h) out.push({ kind: "heat", label: "더위", text: `${dayLabel(h.date)} 최고 ${Math.round(h.value)}°C로 평년보다 더울 전망` });
  const c = found.get("cold");
  if (c) out.push({ kind: "cold", label: "추위", text: `${dayLabel(c.date)} 최저 ${Math.round(c.value)}°C로 평년보다 추울 전망` });
  const r = found.get("rain");
  if (r) out.push({ kind: "rain", label: "많은 비", text: `${dayLabel(r.date)} 하루 ${Math.round(r.value)}mm 안팎의 많은 비 예상` });
  const s = found.get("snow");
  if (s) out.push({ kind: "snow", label: "많은 눈", text: `${dayLabel(s.date)} 하루 ${Math.round(s.value)}cm 안팎의 눈 예상` });
  const w = found.get("wind");
  if (w) out.push({ kind: "wind", label: "강풍", text: `${dayLabel(w.date)} 순간 최대 ${Math.round(w.value)}m/s의 강한 바람 예상` });
  return out;
}

/** 현지 기준 지금 달 (1~12) */
export function localMonth(utcOffsetMin: number, now: Date = new Date()): number {
  return new Date(now.getTime() + utcOffsetMin * 60000).getUTCMonth() + 1;
}
