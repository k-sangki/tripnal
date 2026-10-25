import type { MetadataRoute } from "next";
import { activeGolfRegions } from "@/lib/golf";
import { DESTINATIONS } from "@/lib/overseas";
import { PLACES } from "@/lib/places";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
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
    ...PLACES.map((p) => ({
      url: `${BASE}/weather/${p.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
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
