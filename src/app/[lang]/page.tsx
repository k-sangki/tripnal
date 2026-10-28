import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ForeignFooter, ForeignHeader } from "@/components/ForeignHeader";
import { PLACE_TEXT } from "@/data/places-i18n";
import { OG_LOCALE, SITE_NAME, isForeignLocale, languageAlternates, localePath, type ForeignLocale } from "@/lib/i18n";
import { monthName } from "@/lib/korea-month";
import { getPlace } from "@/lib/places";
import { foreignLeisure } from "@/lib/seo-foreign";

const HOME: Record<ForeignLocale, { title: string; description: string; h1: string; lead: string[]; months: string; groups: Record<string, string> }> = {
  en: {
    title: "Korea Weather Forecast for Travelers · 16-Day, Korea Time (Seoul, Busan, Jeju)",
    description:
      "Planning a trip to Korea? 3-hourly weather for up to 16 days in Korea time for Seoul, Busan, Jeju, Gyeongju, mountains and ski resorts. Rain, wind and feels-like temperature at a glance.",
    h1: "Korea weather for your trip",
    lead: [
      "Hour-by-hour forecasts for the places travelers actually go in South Korea, in Korea time (KST, UTC+9), up to 16 days ahead.",
      "Each forecast is the middle value of three global models (ECMWF, GFS and ICON), so one bad model run doesn't ruin your plans.",
    ],
    months: "Korea weather by month",
    groups: { city: "Cities", travel: "Beaches & sights", hiking: "Mountains", ski: "Ski resorts" },
  },
  ja: {
    title: "韓国の天気・気温｜2週間予報、ソウル・釜山・済州島の傘と服装の目安",
    description:
      "韓国旅行の前にチェック。ソウル・釜山・済州・慶州、山やスキー場の最大2週間・3時間ごとの天気を韓国時間で。雨・風・体感温度をひと目で。",
    h1: "韓国旅行の天気",
    lead: [
      "韓国で旅行者がよく訪れる場所の天気を、韓国時間（日本と時差なし）で最大2週間先まで3時間ごとにお届けします。",
      "予報は世界の3つのモデル（ECMWF・GFS・ICON）の中間値なので、1つのモデルが外れても予定が狂いにくくなっています。",
    ],
    months: "月別 韓国の気温と服装",
    groups: { city: "都市", travel: "ビーチ・観光地", hiking: "山", ski: "スキー場" },
  },
  zh: {
    title: "韓國天氣預報｜首爾・釜山・濟州16天天氣，帶不帶傘一秒決定",
    description:
      "去韓國玩之前先看！首爾、釜山、濟州島、慶州、登山與滑雪場最長16天、每3小時天氣，以韓國時間顯示。下雨、風和體感溫度一目了然，穿搭也不怕踩雷。",
    h1: "韓國旅遊天氣",
    lead: [
      "旅客常去的韓國景點天氣，以韓國時間（比台灣快1小時）顯示，最長可看16天、每3小時一格。",
      "預報取全球三個模式（ECMWF、GFS、ICON）的中間值，就算其中一個失準，行程也不容易被打亂。",
    ],
    months: "韓國各月份氣溫與穿搭",
    groups: { city: "城市", travel: "海灘・景點", hiking: "登山", ski: "滑雪場" },
  },
};

/** 도시는 따로 묶는다 (나머지 여행지는 해변·명소) */
const CITIES = new Set(["seoul", "busan", "jeju", "incheon", "gyeongju", "gangneung", "sokcho", "jeonju", "daegu", "yeosu", "chuncheon", "suncheon", "tongyeong"]);

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isForeignLocale(lang)) return {};
  const h = HOME[lang];
  return {
    title: { absolute: h.title },
    description: h.description,
    alternates: { canonical: localePath(lang, "/"), languages: languageAlternates("/") },
    openGraph: { siteName: SITE_NAME[lang], locale: OG_LOCALE[lang], title: h.title, description: h.description, url: localePath(lang, "/") },
  };
}

export default async function ForeignHome({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isForeignLocale(lang)) notFound();
  const h = HOME[lang];
  const groups: Record<string, { slug: string; name: string; region: string }[]> = { city: [], travel: [], hiking: [], ski: [] };
  for (const [slug, t] of Object.entries(PLACE_TEXT)) {
    const p = getPlace(slug);
    if (!p) continue;
    const g = CITIES.has(slug) ? "city" : foreignLeisure(p);
    groups[g].push({ slug, name: t[lang].name, region: t[lang].region });
  }

  return (
    <div className="shell">
      <ForeignHeader locale={lang} path="/" />
      <section className="card seo-text">
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>{h.h1}</h1>
        {h.lead.map((x) => (
          <p key={x}>{x}</p>
        ))}
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{h.months}</h2>
        <nav className="place-links">
          {Array.from({ length: 12 }, (_, i) => (
            <Link key={i} href={localePath(lang, `/korea/${i + 1}`)}>
              {monthName(i + 1, lang)}
            </Link>
          ))}
        </nav>
      </section>
      {Object.entries(groups).map(([g, list]) =>
        list.length ? (
          <section key={g} className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">{h.groups[g]}</h2>
            <nav className="place-links">
              {list.map((p) => (
                <Link key={p.slug} href={localePath(lang, `/weather/${p.slug}`)} title={p.region}>
                  {p.name}
                </Link>
              ))}
            </nav>
          </section>
        ) : null,
      )}
      <ForeignFooter locale={lang} />
    </div>
  );
}
