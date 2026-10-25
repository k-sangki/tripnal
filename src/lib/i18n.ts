import { WORDS } from "./i18n-words";

/**
 * 외국어 페이지(방한 외국인 검색용). 한국어는 지금 주소 그대로(/weather/seoul),
 * 영어·일본어·번체 중국어는 같은 도메인 하위 경로(/en/weather/seoul, /ja/…, /zh/…)에 둔다.
 * zh는 대만·홍콩용 번체(zh-Hant)다. 간체는 하지 않는다 (중국 본토는 구글이 막혀 있다).
 */
export const FOREIGN_LOCALES = ["en", "ja", "zh"] as const;
export type ForeignLocale = (typeof FOREIGN_LOCALES)[number];
export type Locale = "ko" | ForeignLocale;

export function isForeignLocale(s: string | null | undefined): s is ForeignLocale {
  return (FOREIGN_LOCALES as readonly string[]).includes(s ?? "");
}

/** 검색 결과 위에 나오는 사이트 이름 (SK 2026-10-25) */
export const SITE_NAME: Record<Locale, string> = {
  ko: "트립날씨",
  en: "TripNalc Weather",
  ja: "トリップ天気 Tripnalc",
  zh: "旅遊天氣 TripNalc",
};

export const OG_LOCALE: Record<Locale, string> = { ko: "ko_KR", en: "en_US", ja: "ja_JP", zh: "zh_TW" };

/** <html lang>·hreflang에 쓰는 언어 태그 */
export const LANG_TAG: Record<Locale, string> = { ko: "ko", en: "en", ja: "ja", zh: "zh-Hant" };

/** 언어 전환 버튼에 쓰는 각 언어의 자기 이름 */
export const LOCALE_NAME: Record<Locale, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "繁體中文" };

/** 한국어 경로("/weather/seoul") → 그 언어의 경로 */
export function localePath(l: Locale, path: string): string {
  if (l === "ko") return path;
  return path === "/" ? `/${l}` : `/${l}${path}`;
}

/**
 * hreflang 대체 주소. 번역된 언어만 넣는다. 영어를 x-default로 둬서
 * 한국어·일본어·중국어가 아닌 사람(동남아·유럽 등)에게는 영어판이 나오게 한다.
 */
export function languageAlternates(path: string, locales: readonly Locale[] = ["ko", ...FOREIGN_LOCALES]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[LANG_TAG[l]] = localePath(l, path);
  if (locales.includes("en")) out["x-default"] = localePath("en", path);
  return out;
}

/**
 * 화면 글자 번역. 한국어 문장을 그대로 키로 쓰고, 사전에 없으면 한국어를 돌려준다
 * (한국어 화면은 이 함수를 거쳐도 글자가 바뀌지 않는다).
 */
export function tr(l: Locale, ko: string): string {
  if (l === "ko") return ko;
  return WORDS[ko]?.[l] ?? ko;
}
