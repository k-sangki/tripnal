/** robots.txt. 다음 웹마스터 도구 소유 확인 줄을 넣으려고 metadata robots 대신 직접 만든다. */
export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";
const DAUM = "#DaumWebMasterTool:473f7c68444c608ea9926e63f2727f0c5b83d8f667bce74104121bf8652053b4:RXqVBM7XE5wroppTXsoV6g==";

export function GET() {
  const body = ["User-Agent: *", "Allow: /", "Disallow: /api/", "", `Sitemap: ${BASE}/sitemap.xml`, "", DAUM, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
