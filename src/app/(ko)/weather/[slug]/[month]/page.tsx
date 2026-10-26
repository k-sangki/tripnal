import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KoreaMonthPage, cityName } from "@/components/KoreaMonthPage";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { languageAlternates } from "@/lib/i18n";
import { krNormals, monthDescription, monthTitle, parseMonth } from "@/lib/korea-month";

/** 국내 도시 월별 평년 날씨 (/weather/seoul/11). 영어·일본어판과 hreflang으로 묶는다 */
function parse(slug: string, month: string) {
  const m = parseMonth(month);
  const normals = krNormals(slug);
  return m && normals ? { m, n: normals[m - 1] } : null;
}

export async function generateMetadata({ params }: PageProps<"/weather/[slug]/[month]">): Promise<Metadata> {
  const { slug, month } = await params;
  const p = parse(slug, month);
  if (!p) return {};
  const name = cityName(slug, "ko");
  const title = monthTitle(name, p.m, p.n, "ko");
  const description = monthDescription(name, p.m, p.n, "ko");
  const url = `/weather/${slug}/${p.m}`;
  return {
    title: { absolute: title },
    description,
    keywords: [`${name} ${p.m}월 날씨`, `${name} ${p.m}월 옷차림`, `${name} ${p.m}월 여행`, `${p.m}월 ${name} 기온`],
    alternates: { canonical: url, languages: languageAlternates(url) },
    openGraph: { siteName: "트립날씨", locale: "ko_KR", title, description, url },
  };
}

export default async function Page({ params }: PageProps<"/weather/[slug]/[month]">) {
  const { slug, month } = await params;
  const p = parse(slug, month);
  if (!p) notFound();
  return (
    <div className="shell">
      <SiteHeader />
      <KoreaMonthPage slug={slug} month={p.m} locale="ko" />
      <SiteFooter langPath={`/weather/${slug}/${p.m}`} />
    </div>
  );
}
