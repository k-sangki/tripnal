import { tr, type Locale } from "@/lib/i18n";
import type { DayForecast, Slot } from "@/lib/weather/types";

/** 예보 간격. "day"는 하루 한 칸 */
export type Interval = "day" | "12h" | "6h" | "3h";

export const INTERVALS: { id: Interval; label: string; long: string }[] = [
  { id: "day", label: "일", long: "하루 단위" },
  { id: "12h", label: "12h", long: "12시간 간격" },
  { id: "6h", label: "6h", long: "6시간 간격" },
  { id: "3h", label: "3h", long: "3시간 간격" },
];

export function parseInterval(s: string | null | undefined): Interval {
  return INTERVALS.find((i) => i.id === s)?.id ?? "day";
}

export function intervalLong(i: Interval, l: Locale = "ko") {
  return tr(l, INTERVALS.find((x) => x.id === i)!.long);
}

/** 칸 하나가 몇 시간인지 (하루 단위는 24) */
export function stepHours(i: Interval): number {
  return i === "day" ? 24 : Number(i.slice(0, -1));
}

type Num = number | null;
const nums = (xs: Num[]) => xs.filter((v): v is number => v != null);
const r1 = (v: number) => Math.round(v * 10) / 10;
const maxOf = (xs: Num[]) => (nums(xs).length ? Math.max(...nums(xs)) : null);
const minOf = (xs: Num[]) => (nums(xs).length ? Math.min(...nums(xs)) : null);

const sumOf = (xs: Num[]) => (nums(xs).length ? r1(nums(xs).reduce((a, b) => a + b, 0)) : null);

/** 날씨 외 지표(적설·가시거리·자외선·바다·대기질)를 여러 칸에서 합친다 */
function combineExtra(ss: Slot[]) {
  return {
    snow: sumOf(ss.map((s) => s.snow)),
    visibility: minOf(ss.map((s) => s.visibility)),
    uv: maxOf(ss.map((s) => s.uv)),
    cape: maxOf(ss.map((s) => s.cape)),
    wave: maxOf(ss.map((s) => s.wave)),
    windWave: maxOf(ss.map((s) => s.windWave)),
    tide: ss[0]?.tide ?? null,
    pm10: maxOf(ss.map((s) => s.pm10)),
    pm25: maxOf(ss.map((s) => s.pm25)),
  };
}

/** 칸의 낮·밤 여부. 낮 칸은 최고 기온, 밤 칸은 최저 기온을 대표값으로 쓴다. */
function isDaytime(hour: number, step: number) {
  const mid = hour + step / 2;
  return mid > 6 && mid <= 18;
}

/**
 * 3시간 칸을 6·12시간 칸으로 다시 묶는다. 서로 다른 날은 절대 합치지 않는다.
 * - 기온·체감: 낮 칸은 최고, 밤 칸은 최저
 * - 강수: 합, 강수확률·돌풍·날씨코드: 최대, 구름: 평균
 * - 풍속·풍향: 가장 바람이 센 3시간 칸의 값
 */
export function regroup(slots: Slot[], step: number): Slot[] {
  if (step <= 3) return slots;
  const groups = new Map<number, Slot[]>();
  for (const s of slots) {
    const g = Math.floor(s.hour / step) * step;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }
  return [...groups].map(([hour, ss]) => {
    const day = isDaytime(hour, step);
    const rep = day ? maxOf : minOf;
    const windy = ss.reduce((a, b) => ((b.wind ?? -1) > (a.wind ?? -1) ? b : a));
    const rain = nums(ss.map((s) => s.precip));
    const cloud = nums(ss.map((s) => s.cloud));
    return {
      time: ss[0].time,
      hour,
      temp: rep(ss.map((s) => s.temp)),
      feels: rep(ss.map((s) => s.feels)),
      precip: rain.length ? r1(rain.reduce((a, b) => a + b, 0)) : null,
      precipProb: maxOf(ss.map((s) => s.precipProb)),
      cloud: cloud.length ? Math.round(cloud.reduce((a, b) => a + b, 0) / cloud.length) : null,
      wind: windy.wind,
      gust: maxOf(ss.map((s) => s.gust)),
      windDir: windy.windDir,
      code: maxOf(ss.map((s) => s.code)),
      isDay: day,
      ...combineExtra(ss),
    };
  });
}

/** 하루 전체 칸에 들어갈 시작 시각 목록 (0, 3, 6, ...) */
export function slotHours(step: number): number[] {
  return Array.from({ length: 24 / step }, (_, i) => i * step);
}

export function slotHead(hour: number, step: number, l: Locale = "ko"): string {
  if (step === 12) return tr(l, hour === 0 ? "오전" : "오후");
  if (l === "en") {
    // 영어권은 12시간제: 0→12am, 15→3pm
    const h12 = (h: number) => `${h % 12 || 12}${h % 24 < 12 ? "am" : "pm"}`;
    return step === 6 ? `${h12(hour)}–${h12(hour + 6)}` : h12(hour);
  }
  const unit = l === "ja" || l === "zh" ? "時" : "시";
  if (step === 6) return `${hour}~${hour + 6}${unit}`;
  return `${hour}${unit}`;
}

/** 이미 지난 칸인지 (오늘만) */
export function isPast(hour: number, step: number, nowHour: number) {
  return hour + step <= nowHour;
}

/** 하루 단위 표의 한 칸. 기온은 최고, tempLo는 최저 */
export interface DaySummary extends Slot {
  tempLo: number | null;
}

export function daySummary(d: DayForecast): DaySummary {
  const windy = d.slots.reduce((a, b) => ((b.wind ?? -1) > (a.wind ?? -1) ? b : a), d.slots[0]);
  const cloud = nums(d.slots.map((s) => s.cloud));
  return {
    time: `${d.date}T00:00`,
    hour: 0,
    temp: d.tMax,
    tempLo: d.tMin,
    feels: minOf(d.slots.map((s) => s.feels)),
    precip: d.precipSum,
    precipProb: d.precipProbMax,
    cloud: cloud.length ? Math.round(cloud.reduce((a, b) => a + b, 0) / cloud.length) : null,
    wind: d.windMax,
    gust: d.gustMax,
    windDir: windy?.windDir ?? null,
    code: d.code,
    isDay: true,
    ...combineExtra(d.slots),
    // 하루 단위의 조석은 만조·간조 시각으로 따로 보여준다
    tide: null,
  };
}
