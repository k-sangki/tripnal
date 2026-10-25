import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForeignFooter, ForeignHeader } from "@/components/ForeignHeader";
import { KoreaMonthPage, cityName } from "@/components/KoreaMonthPage";
import { OG_LOCALE, SITE_NAME, isForeignLocale, languageAlternates, localePath } from "@/lib/i18n";
import { MONTH_EN, krNormals, monthDescription, monthTitle, parseMonth } from "@/lib/korea-month";

/** 국내 도시 월별 평년 날씨 영어·일본어판 (/en/weather/seoul/11) */
function parse(lang: string, slug: string, month: string) {
  const m = parseMonth(month);
  const normals = krNormals(slug);
  return isForeignLocale(lang) && m && normals ? { l: lang, m, n: normals[m - 1] } : null;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/weather/[slug]/[month]">): Promise<Metadata> {
  const { lang, slug, month } = await params;
  const p = parse(lang, slug, month);
  if (!p) return {};
  const name = cityName(slug, p.l);
  const title = monthTitle(name, p.m, p.n, p.l);
  const description = monthDescription(name, p.m, p.n, p.l);
  const path = `/weather/${slug}/${p.m}`;
  const url = localePath(p.l, path);
  const mo = MONTH_EN[p.m - 1];
  return {
    title: { absolute: title },
    description,
    keywords:
      p.l === "en"
        ? [`${name} weather in ${mo}`, `${name} in ${mo}`, `what to wear in ${name} in ${mo}`, `Korea weather ${mo}`]
        : [`${name} ${p.m}月 天気`, `${name} ${p.m}月 服装`, `${name} ${p.m}月 気温`, `韓国 ${p.m}月 服装`],
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: { siteName: SITE_NAME[p.l], locale: OG_LOCALE[p.l], title, description, url },
  };
}

export default async function Page({ params }: PageProps<"/[lang]/weather/[slug]/[month]">) {
  const { lang, slug, month } = await params;
  const p = parse(lang, slug, month);
  if (!p) notFound();
  return (
    <div className="shell">
      <ForeignHeader locale={p.l} path={`/weather/${slug}/${p.m}`} />
      <KoreaMonthPage slug={slug} month={p.m} locale={p.l} />
      <ForeignFooter locale={p.l} />
    </div>
  );
}
