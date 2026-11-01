/**
 * 검색 색인에서 뺄 페이지.
 * 2026-10-24~27 사이트맵이 300여 개에서 4,744개로 늘어난 뒤 구글 노출이 0이 되고(10/28),
 * 애드센스도 "가치가 별로 없는 콘텐츠"로 거절했다(10/31). 같은 틀에 숫자만 바뀌는 대량 페이지는
 * 검색에서 빼고(noindex, 링크는 따라감) 사이트맵에서도 뺀다. 페이지와 화면은 그대로 둔다.
 * 빠진 것: 외국어 월별(/en·/ja·/zh의 국내 도시 월별·한국 월별), 국내 월별, 해외 월별, 해외 예보 중복본.
 * 외국어 홈·장소 페이지(번역된 실제 예보)는 유입이 있어 2026-11-02 SK 결정으로 다시 색인.
 * 골프장은 네이버 검색이 많아 2026-11-02 SK 요청으로 다시 색인에 뒀다.
 * 회복되면 고유한 글이 있는 것부터 하나씩 되돌린다.
 */
export const NOINDEX = { index: false, follow: true } as const;

/**
 * 다시 색인하는 외국어. 일본어·중국어는 유입이 있었고 영어는 거의 없어 나중에 연다 (SK 2026-11-02).
 * 이 언어들은 홈·장소·소개·개인정보와 "한국 N월 날씨"(/{lang}/korea/{m})를 색인한다.
 * 국내 도시 월별(/{lang}/weather/{slug}/{m})은 모든 언어에서 계속 noindex.
 */
export const INDEXED_LOCALES: readonly string[] = ["ja", "zh"];

export function localeIndexed(lang: string): boolean {
  return INDEXED_LOCALES.includes(lang);
}
