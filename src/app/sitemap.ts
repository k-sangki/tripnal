import type { MetadataRoute } from "next";
import { GUIDES } from "@/data/guides";
import { PLACE_TEXT } from "@/data/places-i18n";
import { activeGolfRegions } from "@/lib/golf";
import { FOREIGN_LOCALES, languageAlternates, localePath } from "@/lib/i18n";
import { localeIndexed } from "@/lib/indexing";
import { DESTINATIONS } from "@/lib/overseas";
import { PLACES } from "@/lib/places";
import { SEASON_PAGES } from "@/lib/seasonal";

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

type Freq = "hourly" | "daily" | "weekly" | "monthly";

/**
 * 검색에 내보내는 페이지만 적는다. 국내 월별·외국어 월별·해외 월별·해외 예보는
 * noindex라 넣지 않는다 (src/lib/indexing.ts).
 * lastModified는 적지 않는다: 매번 지금 시각을 넣으면 구글이 값을 믿지 않는다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (
    path: string,
    changeFrequency: Freq,
    priority: number,
    langs?: Record<string, string>,
  ) => ({
    url: `${BASE}${path}`,
    changeFrequency,
    priority,
    ...(langs ? { alternates: { languages: langs } } : {}),
  });
  const translated = Object.keys(PLACE_TEXT);
  return [
    page("/", "hourly", 1, languages("/")),
    page("/weather", "weekly", 0.8),
    page("/overseas", "weekly", 0.8),
    page("/weekend", "daily", 0.8),
    page("/tide", "daily", 0.9),
    page("/golf", "weekly", 0.8),
    // 골프장은 네이버 검색이 많아 색인에 둔다 (SK 2026-11-02)
    ...activeGolfRegions().map((r) => page(`/golf/${r.slug}`, "daily", 0.8)),
    ...SEASON_PAGES.map((p) => page(p.href, "daily", 0.8)),
    ...Array.from({ length: 12 }, (_, i) =>
      page(`/overseas/month/${i + 1}`, "monthly", 0.8),
    ),
    page("/guide", "weekly", 0.7),
    ...GUIDES.map((g) => page(`/guide/${g.slug}`, "monthly", 0.7)),
    ...["/about", "/privacy", "/contact"].map((path) =>
      page(path, "monthly", 0.3),
    ),
    ...PLACES.map((p) =>
      page(
        `/weather/${p.slug}`,
        "hourly",
        0.9,
        translated.includes(p.slug)
          ? languages(`/weather/${p.slug}`)
          : undefined,
      ),
    ),
    ...DESTINATIONS.map((d) => page(`/overseas/${d.slug}`, "daily", 0.8)),
    // 일본어·중국어 홈·장소·한국 월별 (SK 2026-11-02 다시 색인, 영어는 나중에)
    ...FOREIGN_LOCALES.filter(localeIndexed).flatMap((l) => [
      page(localePath(l, "/"), "daily", 0.9, languages("/")),
      ...["/about", "/privacy"].map((path) =>
        page(localePath(l, path), "monthly", 0.3),
      ),
      ...translated.map((slug) =>
        page(
          localePath(l, `/weather/${slug}`),
          "hourly",
          0.9,
          languages(`/weather/${slug}`),
        ),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        page(
          localePath(l, `/korea/${i + 1}`),
          "monthly",
          0.8,
          languages(`/korea/${i + 1}`, FOREIGN_LOCALES),
        ),
      ),
    ]),
  ];
}
