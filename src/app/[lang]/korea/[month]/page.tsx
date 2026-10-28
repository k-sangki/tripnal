import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForeignFooter, ForeignHeader } from "@/components/ForeignHeader";
import { KoreaCountryMonth } from "@/components/KoreaCountryMonth";
import { FOREIGN_LOCALES, OG_LOCALE, SITE_NAME, isForeignLocale, languageAlternates, localePath } from "@/lib/i18n";
import { MONTH_EN, countryMonthDescription, countryMonthTitle, parseMonth } from "@/lib/korea-month";

/** 한국 전체 월별 기온·옷차림 (/ja/korea/11). 한국어판은 없다 (한국 사람은 이렇게 찾지 않는다) */
function parse(lang: string, month: string) {
  const m = parseMonth(month);
  return isForeignLocale(lang) && m ? { l: lang, m } : null;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/korea/[month]">): Promise<Metadata> {
  const { lang, month } = await params;
  const p = parse(lang, month);
  if (!p) return {};
  const title = countryMonthTitle(p.m, p.l);
  const description = countryMonthDescription(p.m, p.l);
  const path = `/korea/${p.m}`;
  const url = localePath(p.l, path);
  const mo = MONTH_EN[p.m - 1];
  return {
    title: { absolute: title },
    description,
    keywords:
      p.l === "en"
        ? [`Korea weather in ${mo}`, `Korea in ${mo}`, `what to wear in Korea in ${mo}`, `Seoul temperature ${mo}`]
        : p.l === "zh"
          ? [`韓國${p.m}月天氣`, `韓國${p.m}月氣溫`, `韓國${p.m}月穿搭`, `首爾${p.m}月氣溫`]
          : [`韓国 ${p.m}月 気温`, `韓国 ${p.m}月 服装`, `韓国 ${p.m}月 気候`, `韓国旅行 ${p.m}月 服装`],
    alternates: { canonical: url, languages: languageAlternates(path, FOREIGN_LOCALES) },
    openGraph: { siteName: SITE_NAME[p.l], locale: OG_LOCALE[p.l], title, description, url },
  };
}

export default async function Page({ params }: PageProps<"/[lang]/korea/[month]">) {
  const { lang, month } = await params;
  const p = parse(lang, month);
  if (!p) notFound();
  return (
    <div className="shell">
      <ForeignHeader locale={p.l} path={`/korea/${p.m}`} koPath="/" />
      <KoreaCountryMonth month={p.m} locale={p.l} />
      <ForeignFooter locale={p.l} />
    </div>
  );
}
