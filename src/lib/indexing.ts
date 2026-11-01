/**
 * 검색 색인·광고를 둘 페이지 고르기.
 * 애드센스 "가치가 별로 없는 콘텐츠"(2026-10-31) 대응: 같은 틀에 숫자만 바뀌는 대량 페이지는
 * 검색에서 빼고(noindex, 링크는 따라감) 사이트맵·광고에서도 뺀다. 페이지 자체와 화면은 그대로.
 */

/** 월별 평년 페이지를 색인에 남기는 인기 해외 여행지 */
export const INDEXED_OVERSEAS_MONTH = new Set([
  "osaka", "tokyo", "fukuoka", "sapporo", "okinawa", "kyoto",
  "da-nang", "nha-trang", "ho-chi-minh", "phu-quoc", "hanoi",
  "bangkok", "chiang-mai", "phuket", "cebu", "boracay", "kota-kinabalu",
  "taipei", "hong-kong", "macau", "singapore", "bali",
  "guam", "saipan", "honolulu", "shanghai", "paris", "london", "rome",
]);

export function overseasMonthIndexed(slug: string): boolean {
  return INDEXED_OVERSEAS_MONTH.has(slug);
}

/** 색인에서 뺄 페이지의 metadata.robots */
export const NOINDEX = { index: false, follow: true } as const;
