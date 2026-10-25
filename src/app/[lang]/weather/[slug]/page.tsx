import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForeignFooter, ForeignHeader } from "@/components/ForeignHeader";
import { WeatherApp } from "@/components/WeatherApp";
import { PLACE_TEXT, placeText } from "@/data/places-i18n";
import { OG_LOCALE, SITE_NAME, isForeignLocale, languageAlternates, localePath } from "@/lib/i18n";
import { MONTH_EN, krNormals } from "@/lib/korea-month";
import { getPlace } from "@/lib/places";
import { placeSchemaType } from "@/lib/seo";
import { foreignDescription, foreignKeywords, foreignLeisure, foreignSummary, foreignTitle, shortName } from "@/lib/seo-foreign";
import { getForecast } from "@/lib/weather";
import type { Forecast } from "@/lib/weather/types";

/** 한국어 장소 페이지와 같이 요청마다 그리고, worker.ts가 엣지 캐시에 15분 둔다 */
export const dynamic = "force-dynamic";

const H1_SUFFIX = { en: "weather", ja: "天気", zh: "天氣" } as const;
const SUMMARY_TITLE = { en: "Weather summary", ja: "天気のまとめ", zh: "天氣重點" } as const;
const BY_MONTH = { en: "{c} weather by month", ja: "{c}の月ごとの天気と服装", zh: "{c}每月天氣與穿搭" } as const;
const RELATED = { en: "More places in Korea", ja: "韓国のほかの場所", zh: "韓國其他地點" } as const;
const LOADING = { en: "Loading the forecast…", ja: "予報を読み込んでいます…", zh: "正在載入預報…" } as const;
const HOW = {
  en: "Choose your travel dates above to see only those days, switch between daily and 3-hour views, and save the table as an image to share with your group.",
  ja: "上で旅行の日付を選ぶとその日だけを表示でき、1日ごと・3時間ごとの切り替えや、表を画像で保存して同行者と共有することもできます。",
  zh: "在上方選擇旅遊日期，就能只看那幾天；也可以切換每日或每3小時顯示，並把表格存成圖片和旅伴分享。",
} as const;

function lookup(lang: string, slug: string) {
  if (!isForeignLocale(lang)) return null;
  const place = getPlace(slug);
  const text = placeText(slug, lang);
  return place && text ? { lang, place, text } : null;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/weather/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const x = lookup(lang, slug);
  if (!x) return {};
  const title = foreignTitle(x.place, x.text, x.lang);
  const description = foreignDescription(x.place, x.text, x.lang);
  const path = `/weather/${slug}`;
  const url = localePath(x.lang, path);
  const image = `/api/og?${new URLSearchParams({ slug, lang: x.lang })}`;
  return {
    title: { absolute: title },
    description,
    keywords: foreignKeywords(x.text, x.lang),
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: { siteName: SITE_NAME[x.lang], locale: OG_LOCALE[x.lang], title, description, url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ForeignPlacePage({ params }: PageProps<"/[lang]/weather/[slug]">) {
  const { lang, slug } = await params;
  const x = lookup(lang, slug);
  if (!x) notFound();
  const { place, text } = x;
  const l = x.lang;

  let forecast: Forecast | null = null;
  try {
    forecast = await getForecast(place.lat, place.lon, place.elevation);
  } catch (e) {
    console.error(e);
  }

  const path = `/weather/${slug}`;
  const related = Object.keys(PLACE_TEXT)
    .filter((s) => s !== slug)
    .map((s) => ({ slug: s, name: PLACE_TEXT[s][l].name }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": placeSchemaType(place),
        name: text.name,
        address: text.region,
        geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lon, ...(place.elevation ? { elevation: place.elevation } : {}) },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME[l], item: `https://tripnalc.com${localePath(l, "/")}` },
          { "@type": "ListItem", position: 2, name: `${shortName(text.name)} ${H1_SUFFIX[l]}`, item: `https://tripnalc.com${localePath(l, path)}` },
        ],
      },
    ],
  };

  return (
    <div className="shell">
      <ForeignHeader locale={l} path={path} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WeatherApp
        initialPlace={{ name: text.name, lat: place.lat, lon: place.lon, address: text.region, elevation: place.elevation, slug: place.slug }}
        initialForecast={forecast}
        initialLeisure={foreignLeisure(place)}
        headingSuffix={H1_SUFFIX[l]}
      />

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>
          {shortName(text.name)} {SUMMARY_TITLE[l]}
        </h2>
        {forecast ? foreignSummary(text, forecast, l).map((line) => <p key={line}>{line}</p>) : <p>{LOADING[l]}</p>}
        <p>{text.about}</p>
        <p>{HOW[l]}</p>
      </section>

      {krNormals(slug) && (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">{BY_MONTH[l].replace("{c}", shortName(text.name))}</h2>
          <nav className="place-links">
            {Array.from({ length: 12 }, (_, i) => (
              <Link key={i} href={localePath(l, `/weather/${slug}/${i + 1}`)}>
                {l === "en" ? MONTH_EN[i] : `${i + 1}月`}
              </Link>
            ))}
          </nav>
        </section>
      )}

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{RELATED[l]}</h2>
        <nav className="place-links">
          {related.map((p) => (
            <Link key={p.slug} href={localePath(l, `/weather/${p.slug}`)}>
              {p.name}
            </Link>
          ))}
        </nav>
      </section>
      <ForeignFooter locale={l} />
    </div>
  );
}
