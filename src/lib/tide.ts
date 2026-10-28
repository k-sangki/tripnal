import { muldae, lunarDay } from "@/lib/muldae";
import { PLACES, type Place } from "@/lib/places";
import { addDays } from "@/lib/time";
import type { TideFile, TideStation } from "@/lib/weather/collected";
import type { WeekendDay } from "@/lib/weekend";

/** 물때표 모음(/tide)의 바다 묶음. 장소 region 맨 앞 시·도로 나눈다 */
export const SEAS = [
  { id: "west", label: "서해", regions: ["인천", "경기", "충남", "전북"] },
  { id: "south", label: "남해", regions: ["전남", "경남", "부산"] },
  { id: "east", label: "동해", regions: ["강원", "경북", "울산"] },
  { id: "jeju", label: "제주", regions: ["제주"] },
] as const;

export type SeaId = (typeof SEAS)[number]["id"];

export function seaOf(p: Pick<Place, "region">): SeaId | null {
  const head = p.region.split(" ")[0];
  return SEAS.find((s) => (s.regions as readonly string[]).includes(head))?.id ?? null;
}

export const TIDE_PLACES = PLACES.filter((p) => p.leisure === "fishing" && seaOf(p));

/** 7물때식에서 물살이 센 사리(6~8물)와 약한 조금·무시 */
export function muldaeTone(name: string): "sari" | "jogeum" | null {
  if (["6물", "7물", "8물"].includes(name)) return "sari";
  if (name === "조금" || name === "무시") return "jogeum";
  return null;
}

export function muldaeWeek(today: string, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i);
    const name = muldae(date);
    return { date, name, tone: muldaeTone(name) };
  });
}

export interface TideDay {
  high: string[];
  low: string[];
}

/** 관측소 찾는 거리. 장소 페이지(collected.ts loadTide)와 같은 25km */
const MAX_KM = 25;

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.hypot(x, y) * 6371;
}

type Bucket = { get(key: string): Promise<{ json<T>(): Promise<T> } | null> };

async function bucket(): Promise<Bucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = (await getCloudflareContext({ async: true })).env as unknown as { DATA?: Bucket };
    return env.DATA ?? null;
  } catch {
    return null;
  }
}

/** 장소별 그날 만조·간조 시각 (가장 가까운 국립해양조사원 관측소). R2가 없으면 null */
export async function loadTideDay(places: Place[], date: string): Promise<Record<string, TideDay> | null> {
  const b = await bucket();
  const stations = b ? await b.get("tide/stations.json").then((o) => o?.json<TideStation[]>() ?? null).catch(() => null) : null;
  if (!b || !stations) return process.env.NODE_ENV === "development" ? devTideDay(places, date) : null;
  const nearest = new Map<string, string>();
  for (const p of places) {
    let best: TideStation | null = null;
    let bestKm = Infinity;
    for (const s of stations) {
      const d = km(p.lat, p.lon, s.lat, s.lon);
      if (d < bestKm) [best, bestKm] = [s, d];
    }
    if (best && bestKm <= MAX_KM) nearest.set(p.slug, best.code);
  }
  const files = new Map<string, TideFile | null>();
  await Promise.all(
    [...new Set(nearest.values())].map(async (code) => {
      files.set(code, await b.get(`tide/${code}.json`).then((o) => o?.json<TideFile>() ?? null).catch(() => null));
    }),
  );
  const out: Record<string, TideDay> = {};
  for (const [slug, code] of nearest) {
    const f = files.get(code);
    if (!f) continue;
    const today = f.events.filter(([at]) => at.startsWith(date));
    out[slug] = {
      high: today.filter(([, k]) => k === "H").map(([at]) => at.slice(11, 16)),
      low: today.filter(([, k]) => k === "L").map(([at]) => at.slice(11, 16)),
    };
  }
  return out;
}

/** 개발 화면용 가짜 시각 (R2 없음). 음력 날짜마다 약 48분씩 늦어지는 만조를 흉내 낸다 */
function devTideDay(places: Place[], date: string): Record<string, TideDay> {
  const hm = (m: number) => {
    const t = ((Math.round(m) % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const out: Record<string, TideDay> = {};
  for (const p of places) {
    const h = lunarDay(date) * 48 + (130 - p.lon) * 200;
    out[p.slug] = { high: [hm(h), hm(h + 745)].sort(), low: [hm(h + 372), hm(h + 1117)].sort() };
  }
  return out;
}

export interface TideRow {
  place: Place;
  tide: TideDay | null;
  day: WeekendDay | null;
}

export function tideRows(sea: SeaId, tides: Record<string, TideDay> | null, days: Record<string, WeekendDay[]> | undefined, date: string): TideRow[] {
  return TIDE_PLACES.filter((p) => seaOf(p) === sea).map((place) => ({
    place,
    tide: tides?.[place.slug] ?? null,
    day: days?.[place.slug]?.find((d) => d.date === date) ?? null,
  }));
}
