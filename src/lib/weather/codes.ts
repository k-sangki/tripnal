import { tr, type Locale } from "@/lib/i18n";

/** WMO weather code → 한국어 설명과 아이콘 (다른 언어 설명은 i18n-words의 사전) */
interface CodeInfo {
  label: string;
  day: string;
  night: string;
}

const TABLE: Record<number, CodeInfo> = {
  0: { label: "맑음", day: "☀️", night: "🌙" },
  1: { label: "대체로 맑음", day: "🌤️", night: "🌙" },
  2: { label: "구름 조금", day: "⛅", night: "☁️" },
  3: { label: "흐림", day: "☁️", night: "☁️" },
  45: { label: "안개", day: "🌫️", night: "🌫️" },
  48: { label: "짙은 안개", day: "🌫️", night: "🌫️" },
  51: { label: "약한 이슬비", day: "🌦️", night: "🌧️" },
  53: { label: "이슬비", day: "🌦️", night: "🌧️" },
  55: { label: "강한 이슬비", day: "🌧️", night: "🌧️" },
  56: { label: "어는 이슬비", day: "🌧️", night: "🌧️" },
  57: { label: "어는 이슬비", day: "🌧️", night: "🌧️" },
  61: { label: "약한 비", day: "🌦️", night: "🌧️" },
  63: { label: "비", day: "🌧️", night: "🌧️" },
  65: { label: "강한 비", day: "🌧️", night: "🌧️" },
  66: { label: "어는 비", day: "🌧️", night: "🌧️" },
  67: { label: "어는 비", day: "🌧️", night: "🌧️" },
  71: { label: "약한 눈", day: "🌨️", night: "🌨️" },
  73: { label: "눈", day: "🌨️", night: "🌨️" },
  75: { label: "많은 눈", day: "❄️", night: "❄️" },
  77: { label: "싸락눈", day: "🌨️", night: "🌨️" },
  80: { label: "소나기", day: "🌦️", night: "🌧️" },
  81: { label: "소나기", day: "🌧️", night: "🌧️" },
  82: { label: "강한 소나기", day: "⛈️", night: "⛈️" },
  85: { label: "눈 소나기", day: "🌨️", night: "🌨️" },
  86: { label: "강한 눈 소나기", day: "❄️", night: "❄️" },
  95: { label: "뇌우", day: "⛈️", night: "⛈️" },
  96: { label: "우박 동반 뇌우", day: "⛈️", night: "⛈️" },
  99: { label: "우박 동반 뇌우", day: "⛈️", night: "⛈️" },
};

const UNKNOWN: CodeInfo = { label: "-", day: "·", night: "·" };

export function codeInfo(code: number | null): CodeInfo {
  if (code == null) return UNKNOWN;
  return TABLE[code] ?? UNKNOWN;
}

export function codeIcon(code: number | null, isDay = true): string {
  const info = codeInfo(code);
  return isDay ? info.day : info.night;
}

/** 강수 계열 코드인지 */
export function isWet(code: number | null): boolean {
  return code != null && code >= 51;
}

const DIRS = ["북", "북북동", "북동", "동북동", "동", "동남동", "남동", "남남동", "남", "남남서", "남서", "서남서", "서", "서북서", "북서", "북북서"];

const DIRS_EN = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const DIRS_JA = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];

/** 풍향(불어오는 방향, 도) → "북서" 등 */
export function windDirKo(deg: number | null): string {
  return windDir(deg);
}

export function windDir(deg: number | null, l: Locale = "ko"): string {
  if (deg == null) return "-";
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return (l === "en" ? DIRS_EN : l === "ja" ? DIRS_JA : DIRS)[i];
}

/** 풍향 설명 ("북서풍", "NW wind", "北西の風") */
export function windDirLabel(deg: number | null, l: Locale = "ko"): string {
  const d = windDir(deg, l);
  return l === "en" ? `${d} wind` : l === "ja" ? `${d}の風` : `${d}풍`;
}

/** 날씨 설명을 그 언어로 */
export function codeLabel(code: number | null, l: Locale = "ko"): string {
  return tr(l, codeInfo(code).label);
}
