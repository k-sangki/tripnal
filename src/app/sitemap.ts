import type { MetadataRoute } from "next";
import { activeGolfRegions } from "@/lib/golf";
import { DESTINATIONS } from "@/lib/overseas";
import { PLACE_TEXT } from "@/data/places-i18n";
import { FOREIGN_LOCALES, languageAlternates, localePath, type Locale } from "@/lib/i18n";
import { KOREA_MONTH_CITIES } from "@/lib/korea-month";
import { PLACES } from "@/lib/places";

/** 번역된 페이지는 각 언어판 주소를 함께 적는다 (hreflang) */
function languages(path: string) {
  return Object.fromEntries(Object.entries(languageAlternates(path)).map(([l, p]) => [l, `${BASE}${p}`]));
}

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "hourly", priority: 1, alternates: { languages: languages("/") } },
    { url: `${BASE}/weather`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/overseas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/weekend`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/golf`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...activeGolfRegions().map((r) => ({ url: `${BASE}/golf/${r.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...Array.from({ length: 12 }, (_, i) => ({
      url: `${BASE}/overseas/month/${i + 1}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...["/about", "/privacy", "/contact"].map((path) => ({ url: `${BASE}${path}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...FOREIGN_LOCALES.flatMap((l) =>
      ["/about", "/privacy"].map((path) => ({ url: `${BASE}${localePath(l, path)}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.3 })),
    ),
    ...PLACES.map((p) => ({
      url: `${BASE}/weather/${p.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
      ...(p.slug in PLACE_TEXT ? { alternates: { languages: languages(`/weather/${p.slug}`) } } : {}),
    })),
    // 국내 도시 월별 평년 날씨 (한국어·영어·일본어)
    ...(["ko", ...FOREIGN_LOCALES] as Locale[]).flatMap((l) =>
      KOREA_MONTH_CITIES.flatMap((slug) =>
        Array.from({ length: 12 }, (_, i) => ({
          url: `${BASE}${localePath(l, `/weather/${slug}/${i + 1}`)}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.7,
          alternates: { languages: languages(`/weather/${slug}/${i + 1}`) },
        })),
      ),
    ),
    // 영어·일본어 홈과 장소 페이지
    ...FOREIGN_LOCALES.flatMap((l) => [
      { url: `${BASE}${localePath(l, "/")}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9, alternates: { languages: languages("/") } },
      ...Object.keys(PLACE_TEXT).map((slug) => ({
        url: `${BASE}${localePath(l, `/weather/${slug}`)}`,
        lastModified: now,
        changeFrequency: "hourly" as const,
        priority: 0.9,
        alternates: { languages: languages(`/weather/${slug}`) },
      })),
    ]),
    ...DESTINATIONS.flatMap((d) => [
      { url: `${BASE}/overseas/${d.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      { url: `${BASE}/overseas/${d.slug}/forecast`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 },
      ...Array.from({ length: 12 }, (_, i) => ({
        url: `${BASE}/overseas/${d.slug}/${i + 1}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ]),
  ];
}
