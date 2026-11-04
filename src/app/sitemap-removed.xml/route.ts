import { REMOVED_LASTMOD, removedPaths } from "@/lib/removedSitemap";

/** 임시 사이트맵 (src/lib/removedSitemap.ts) */
export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";

export function GET() {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...removedPaths().map((p) => `<url><loc>${BASE}${p}</loc><lastmod>${REMOVED_LASTMOD}</lastmod></url>`),
    "</urlset>",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
