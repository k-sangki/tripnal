import type { MetadataRoute } from "next";
import { activeGolfRegions } from "@/lib/golf";
import { DESTINATIONS } from "@/lib/overseas";
import { PLACES } from "@/lib/places";
import { SEASON_PAGES } from "@/lib/seasonal";
import { GUIDES } from "@/data/guides";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";

/**
 * 검색에 내보내는 한국어 페이지만 적는다. 외국어판·국내 월별·해외 월별·해외 예보는
 * noindex라 넣지 않는다 (src/lib/indexing.ts).
 * lastModified는 적지 않는다: 매번 지금 시각을 넣으면 구글이 값을 믿지 않는다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, changeFrequency: "hourly" | "daily" | "weekly" | "monthly", priority: number) => ({
    url: `${BASE}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page("/", "hourly", 1),
    page("/weather", "weekly", 0.8),
    page("/overseas", "weekly", 0.8),
    page("/weekend", "daily", 0.8),
    page("/tide", "daily", 0.9),
    page("/golf", "weekly", 0.8),
    // 골프장은 네이버 검색이 많아 색인에 둔다 (SK 2026-11-02)
    ...activeGolfRegions().map((r) => page(`/golf/${r.slug}`, "daily", 0.8)),
    ...SEASON_PAGES.map((p) => page(p.href, "daily", 0.8)),
    ...Array.from({ length: 12 }, (_, i) => page(`/overseas/month/${i + 1}`, "monthly", 0.8)),
    page("/guide", "weekly", 0.7),
    ...GUIDES.map((g) => page(`/guide/${g.slug}`, "monthly", 0.7)),
    ...["/about", "/privacy", "/contact"].map((path) => page(path, "monthly", 0.3)),
    ...PLACES.map((p) => page(`/weather/${p.slug}`, "hourly", 0.9)),
    ...DESTINATIONS.map((d) => page(`/overseas/${d.slug}`, "daily", 0.8)),
  ];
}
