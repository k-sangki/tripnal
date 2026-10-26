import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForeignFooter, ForeignHeader } from "@/components/ForeignHeader";
import { CONTACT_EMAIL } from "@/components/TextPage";
import { SITE_NAME, isForeignLocale, languageAlternates, localePath, type ForeignLocale } from "@/lib/i18n";

/** 영어·일본어·중국어 소개 */
const DOC: Record<ForeignLocale, { title: string; paras: string[]; contact: string }> = {
  en: {
    title: "About TripNalc Weather",
    paras: [
      "TripNalc Weather is a weather site for traveling in South Korea, made in Korea. It shows 3-hourly forecasts up to 16 days ahead for the places travelers actually go, in Korea time, with the information that matters on the road: rain chance, wind and gusts, feels-like temperature, fine dust, sunrise and sunset.",
      "Each forecast is the hour-by-hour middle value of three global weather models: ECMWF (European Centre for Medium-Range Weather Forecasts), GFS (US NOAA/NCEP) and ICON (German Weather Service, DWD). Taking the middle of three means one model going badly wrong does not mislead you. Temperatures on mountain peaks are adjusted to the summit's elevation.",
      "Monthly pages use averages from Korea Meteorological Administration (KMA) weather station records for 1991–2020.",
      "Forecasts can differ from actual weather. Before hiking or going out to sea, please also check official warnings from the KMA.",
    ],
    contact: "Contact",
  },
  ja: {
    title: "トリップ天気について",
    paras: [
      "トリップ天気（Tripnalc）は、韓国で作られた韓国旅行のための天気サイトです。旅行者がよく訪れる場所の最大2週間・3時間ごとの予報を韓国時間でお届けし、降水確率、風と突風、体感温度、PM2.5、日の出・日の入りなど旅先で必要な情報をひと目で見られます。",
      "予報は世界の3つの数値予報モデル、ECMWF（ヨーロッパ中期予報センター）・GFS（米国NOAA/NCEP）・ICON（ドイツ気象局DWD）の時間ごとの中間値です。1つのモデルが大きく外れても惑わされにくくなります。山頂の気温は山頂の標高に合わせて補正しています。",
      "月ごとのページは、韓国気象庁の観測所データ（1991〜2020年）の平均を使っています。",
      "予報は実際の天気と異なることがあります。登山や海に出る前は、韓国気象庁の注意報・警報もご確認ください。",
    ],
    contact: "お問い合わせ",
  },
  zh: {
    title: "關於旅遊天氣",
    paras: [
      "旅遊天氣（TripNalc）是在韓國製作、專為韓國旅遊設計的天氣網站。針對旅客常去的地點，以韓國時間提供最長16天、每3小時的預報，降雨機率、風與陣風、體感溫度、PM2.5、日出日落等旅途中需要的資訊一目了然。",
      "預報取全球三個數值預報模式逐時的中間值：ECMWF（歐洲中期天氣預報中心）、GFS（美國NOAA/NCEP）與ICON（德國氣象局DWD）。取三者的中間值，就算其中一個模式大幅失準也不容易被誤導。山頂氣溫會依山頂海拔修正。",
      "每月天氣頁面使用韓國氣象廳觀測站1991～2020年資料的平均值。",
      "預報可能與實際天氣不同。登山或出海前，也請確認韓國氣象廳發布的特報。",
    ],
    contact: "聯絡我們",
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!isForeignLocale(lang)) return {};
  return {
    title: { absolute: DOC[lang].title },
    description: DOC[lang].paras[0],
    alternates: { canonical: localePath(lang, "/about"), languages: languageAlternates("/about") },
    openGraph: { siteName: SITE_NAME[lang] },
  };
}

export default async function About({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isForeignLocale(lang)) notFound();
  const d = DOC[lang];
  return (
    <div className="shell">
      <ForeignHeader locale={lang} path="/about" />
      <article className="card seo-text doc">
        <h1>{d.title}</h1>
        {d.paras.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <h2>{d.contact}</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </article>
      <ForeignFooter locale={lang} />
    </div>
  );
}
