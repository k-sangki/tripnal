import type { LeisureId } from "@/lib/leisure";

/**
 * 내 장소(즐겨찾기). 로그인 없이 브라우저에만 저장한다.
 * 홈 맨 위 "내 장소" 띠에서 장소마다 다가오는 토요일 판정을 보여 준다.
 */
export interface FavPlace {
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  address?: string;
  /** 장소 페이지(/weather/slug)면 */
  slug?: string;
  /** 저장할 때 보던 레저 (판정 기준) */
  act: LeisureId;
}

const KEY = "tripnal:favs";
export const FAV_MAX = 8;
/** 같은 화면의 별·띠가 같이 바뀌게 알리는 이벤트 */
export const FAV_EVENT = "tripnal:favs";

export const favKey = (p: { lat: number; lon: number }) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;

export function loadFavs(): FavPlace[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((p) => p && typeof p.name === "string" && Number.isFinite(p.lat) && Number.isFinite(p.lon)) : [];
  } catch {
    return [];
  }
}

function saveFavs(list: FavPlace[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, FAV_MAX)));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드)는 이번 화면에서만
  }
  window.dispatchEvent(new Event(FAV_EVENT));
}

/** 있으면 빼고, 없으면 맨 앞에 넣는다. 넣었으면 true */
export function toggleFav(p: FavPlace): boolean {
  const list = loadFavs();
  const k = favKey(p);
  if (list.some((x) => favKey(x) === k)) {
    saveFavs(list.filter((x) => favKey(x) !== k));
    return false;
  }
  saveFavs([p, ...list]);
  return true;
}

/** 다가오는 토요일 (오늘이 토요일이면 오늘, 일요일이면 오늘) */
export function nextWeekendDay(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const w = t.getUTCDay();
  if (w !== 0) t.setUTCDate(t.getUTCDate() + (6 - w));
  return t.toISOString().slice(0, 10);
}
