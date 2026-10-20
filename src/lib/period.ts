import { addDays, diffDays, shortDateKo, weekday } from "@/lib/time";

export const MAX_DAYS = 16;

export interface Period {
  from: string;
  to: string;
}

export type PresetId = "today" | "3d" | "weekend" | "16d";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "today", label: "오늘" },
  { id: "3d", label: "3일" },
  { id: "weekend", label: "이번 주말" },
  { id: "16d", label: "16일" },
];

export function lastDay(today: string) {
  return addDays(today, MAX_DAYS - 1);
}

export function presetPeriod(id: PresetId, today: string): Period {
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "3d":
      return { from: today, to: addDays(today, 2) };
    case "16d":
      return { from: today, to: lastDay(today) };
    case "weekend": {
      const w = weekday(today);
      if (w === 0) return { from: today, to: today };
      const sat = addDays(today, 6 - w);
      return { from: sat, to: addDays(sat, 1) };
    }
  }
}

export function matchPreset(p: Period, today: string): PresetId | null {
  return PRESETS.find(({ id }) => {
    const q = presetPeriod(id, today);
    return q.from === p.from && q.to === p.to;
  })?.id ?? null;
}

/** 범위를 오늘~16일 안으로 맞추고 from<=to 보장. 잘못된 값이면 기본(3일). */
export function clampPeriod(from: string | null | undefined, to: string | null | undefined, today: string): Period {
  const valid = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!valid(from) || !valid(to)) return presetPeriod("16d", today);
  const end = lastDay(today);
  const clamp = (d: string) => (diffDays(today, d) < 0 ? today : diffDays(d, end) < 0 ? end : d);
  let a = clamp(from);
  let b = clamp(to);
  if (diffDays(a, b) < 0) [a, b] = [b, a];
  return { from: a, to: b };
}

export function inPeriod(date: string, p: Period) {
  return diffDays(p.from, date) >= 0 && diffDays(date, p.to) >= 0;
}

/** "10/19(일)~10/21(화) 2박 3일" 같은 표기용 일수 */
export function periodNights(p: Period) {
  const days = diffDays(p.from, p.to) + 1;
  return { days, nights: days - 1 };
}

/** "10/24(토) ~ 10/26(월) · 2박 3일" */
export function periodLabel(p: Period) {
  const { days, nights } = periodNights(p);
  if (days === 1) return shortDateKo(p.from);
  return `${shortDateKo(p.from)} ~ ${shortDateKo(p.to)} · ${nights}박 ${days}일`;
}
