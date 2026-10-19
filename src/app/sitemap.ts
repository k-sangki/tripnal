import type { MetadataRoute } from "next";
import { PLACES } from "@/lib/places";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/weather`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...["/about", "/privacy", "/contact"].map((path) => ({ url: `${BASE}${path}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...PLACES.map((p) => ({
      url: `${BASE}/weather/${p.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
  ];
}
