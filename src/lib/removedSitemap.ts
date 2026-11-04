import { PLACE_TEXT } from "@/data/places-i18n";
import { getNormals } from "@/lib/climate";
import { FOREIGN_LOCALES, localePath } from "@/lib/i18n";
import { localeIndexed } from "@/lib/indexing";
import { KOREA_MONTH_CITIES } from "@/lib/korea-month";
import { DESTINATIONS } from "@/lib/overseas";

/**
 * 임시 사이트맵: noindex로 바꾼 페이지만 적는다 (2026-11-04 SK 승인).
 * 구글이 이 페이지들을 빨리 다시 방문해 noindex를 확인하게 하려는 것으로,
 * 서치 콘솔 "noindex로 제외됨"이 충분히 늘면(2주쯤 뒤) 이 파일과 서치 콘솔 제출을 지운다.
 * lastmod는 noindex를 넣은 날(PR #123 배포).
 */
export const REMOVED_LASTMOD = "2026-11-02";
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function removedPaths(): string[] {
  const paths: string[] = [];
  for (const c of KOREA_MONTH_CITIES) for (const m of MONTHS) paths.push(`/weather/${c}/${m}`);
  for (const d of DESTINATIONS) {
    paths.push(`/overseas/${d.slug}/forecast`);
    if (getNormals(d.slug)) for (const m of MONTHS) paths.push(`/overseas/${d.slug}/${m}`);
  }
  for (const l of FOREIGN_LOCALES) {
    for (const c of KOREA_MONTH_CITIES) for (const m of MONTHS) paths.push(localePath(l, `/weather/${c}/${m}`));
    if (localeIndexed(l)) continue;
    paths.push(localePath(l, "/"), localePath(l, "/about"), localePath(l, "/privacy"));
    for (const s of Object.keys(PLACE_TEXT)) paths.push(localePath(l, `/weather/${s}`));
    for (const m of MONTHS) paths.push(localePath(l, `/korea/${m}`));
  }
  return paths;
}

