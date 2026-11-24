import type { MetadataRoute } from "next";
import { GUIDES } from "@/data/guides";
import { PLACE_TEXT } from "@/data/places-i18n";
import { activeGolfRegions } from "@/lib/golf";
import { FOREIGN_LOCALES, languageAlternates, localePath } from "@/lib/i18n";
import { localeIndexed } from "@/lib/indexing";
import { DESTINATIONS } from "@/lib/overseas";
import { PLACES } from "@/lib/places";
import { SEASON_PAGES } from "@/lib/seasonal";
import LASTMOD from "@/data/lastmod.json";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";

/** 번역된 페이지는 각 언어판 주소를 함께 적는다 (hreflang) */
function languages(
  path: string,
  locales?: Parameters<typeof languageAlternates>[1],
) {
  return Object.fromEntries(
    Object.entries(languageAlternates(path, locales)).map(([l, p]) => [
      l,
      `${BASE}${p}`,
    ]),
  );
}

const lastmod: Record<string, string> = LASTMOD;

/**
 * 검색에 내보내는 페이지만 적는다. 국내 월별·외국어 월별·해외 월별·해외 예보는
 * noindex라 넣지 않는다 (src/lib/indexing.ts).
 * lastModified는 그 페이지만의 글·자료가 실제로 바뀐 날짜다 (scripts/gen-lastmod.mjs가 git 기록에서 계산,
 * 배포 때 다시 만든다). 매번 지금 시각을 넣으면 구글이 값을 믿지 않는다.
 * changefreq·priority는 구글이 쓰지 않아 뺐다 (2026-11-25).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (
    path: string,
    langs?: Record<string, string>,
  ) => ({
    url: `${BASE}${path}`,
    ...(lastmod[path] ? { lastModified: lastmod[path] } : {}),
    ...(langs && Object.keys(langs).length ? { alternates: { languages: langs } } : {}),
  });
  const translated = Object.keys(PLACE_TEXT);
  return [
    page("/", languages("/")),
    page("/weather"),
    page("/overseas"),
    page("/weekend"),
    page("/tide"),
    page("/golf"),
    // 골프장은 네이버 검색이 많아 색인에 둔다 (SK 2026-11-02)
    ...activeGolfRegions().map((r) => page(`/golf/${r.slug}`)),
    ...SEASON_PAGES.map((p) => page(p.href)),
    ...Array.from({ length: 12 }, (_, i) =>
      page(`/overseas/month/${i + 1}`),
    ),
    page("/guide"),
    ...GUIDES.map((g) => page(`/guide/${g.slug}`)),
    ...["/about", "/privacy", "/contact"].map((path) =>
      page(path),
    ),
    ...PLACES.map((p) =>
      page(
        `/weather/${p.slug}`,
        translated.includes(p.slug)
          ? languages(`/weather/${p.slug}`)
          : undefined,
      ),
    ),
    ...DESTINATIONS.map((d) => page(`/overseas/${d.slug}`)),
    // 일본어·중국어 홈·장소·한국 월별 (SK 2026-11-02 다시 색인, 영어는 나중에)
    ...FOREIGN_LOCALES.filter(localeIndexed).flatMap((l) => [
      page(localePath(l, "/"), languages("/")),
      ...["/about", "/privacy"].map((path) =>
        page(localePath(l, path)),
      ),
      ...translated.map((slug) =>
        page(
          localePath(l, `/weather/${slug}`),
          languages(`/weather/${slug}`),
        ),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        page(
          localePath(l, `/korea/${i + 1}`),
          languages(`/korea/${i + 1}`, FOREIGN_LOCALES),
        ),
      ),
    ]),
  ];
}
