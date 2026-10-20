import type { MonthNormal } from "@/lib/climate";
import type { Forecast } from "@/lib/weather/types";

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
export function weatherIssues(normals: MonthNormal[], f: Forecast): WeatherIssue[] {
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
