import Link from "next/link";
import { localePath, type ForeignLocale } from "@/lib/i18n";
import { KOREA_MONTH_CITIES, clothes, degrees, krNormals, monthName, monthNotes, vsHome } from "@/lib/korea-month";
import { AD_SLOTS, AdSlot } from "./AdSlot";
import { cityName } from "./KoreaMonthPage";

type Text = Record<ForeignLocale, string>;

const T = {
  h1: { en: "Korea weather in {m}: temperatures and what to wear", ja: "韓国 {m}の気温と服装", zh: "韓國{m}氣溫與穿搭" },
  lead: {
    en: "Average high and low in Seoul are {hi} and {lo}. The table below shows the same month for 10 cities, from 1991–2020 weather station records.",
    ja: "ソウルの平均最高気温は{hi}、平均最低気温は{lo}です。下の表は韓国10都市の{m}の平年値（1991〜2020年の観測）です。",
    zh: "首爾平均最高氣溫{hi}、平均最低{lo}。下表是韓國10個城市{m}的平均值（1991～2020年觀測）。",
  },
  home: { en: "", ja: "東京と比べると、ソウルの平均気温は約{d}℃{w}です。", zh: "和台北相比，首爾平均氣溫{w}約{d}℃。" },
  colder: { en: "", ja: "低め", zh: "低" },
  warmer: { en: "", ja: "高め", zh: "高" },
  cities: { en: "{m} by city", ja: "都市別の{m}の気温", zh: "各城市{m}氣溫" },
  city: { en: "City", ja: "都市", zh: "城市" },
  high: { en: "High", ja: "最高", zh: "最高" },
  low: { en: "Low", ja: "最低", zh: "最低" },
  rain: { en: "Rain (mm)", ja: "降水量(mm)", zh: "雨量(mm)" },
  wear: { en: "What to wear (Seoul)", ja: "服装の目安（ソウル）", zh: "穿搭建議（首爾）" },
  day: { en: "Daytime", ja: "日中", zh: "白天" },
  night: { en: "Morning & night", ja: "朝晩", zh: "早晚" },
  notes: { en: "Good to know in {m}", ja: "{m}の韓国旅行で知っておきたいこと", zh: "{m}去韓國的小提醒" },
  months: { en: "Other months", ja: "ほかの月", zh: "其他月份" },
  cta: { en: "See the live 16-day forecast for each place →", ja: "旅行先の最新2週間予報を見る →", zh: "看各地最新16天預報 →" },
} satisfies Record<string, Text>;

function fill(s: string, v: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
}

/** 한국 전체 ○월 기온·옷차림 (/en|ja|zh/korea/{1-12}) */
export function KoreaCountryMonth({ month: m, locale: l }: { month: number; locale: ForeignLocale }) {
  const mn = monthName(m, l);
  const seoul = krNormals("seoul")![m - 1];
  const d = vsHome(seoul, m, l);
  return (
    <>
      <section className="card seo-text">
        <h1 style={{ fontSize: 22, margin: "0 0 12px", color: "var(--ink)" }}>{fill(T.h1[l], { m: mn })}</h1>
        <p>{fill(T.lead[l], { hi: degrees(seoul.hi, l), lo: degrees(seoul.lo, l), m: mn })}</p>
        {d != null && Math.abs(d) >= 0.5 && <p>{fill(T.home[l], { d: Math.abs(Math.round(d)), w: d < 0 ? T.colder[l] : T.warmer[l] })}</p>}
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{fill(T.cities[l], { m: mn })}</h2>
        <table className="km-table">
          <thead>
            <tr>
              <th>{T.city[l]}</th>
              <th>{T.high[l]}</th>
              <th>{T.low[l]}</th>
              <th>{T.rain[l]}</th>
            </tr>
          </thead>
          <tbody>
            {KOREA_MONTH_CITIES.map((slug) => {
              const n = krNormals(slug)![m - 1];
              return (
                <tr key={slug}>
                  <td>
                    <Link href={localePath(l, `/weather/${slug}/${m}`)}>{cityName(slug, l)}</Link>
                  </td>
                  <td className="v-hi">{Math.round(n.hi)}°</td>
                  <td className="v-lo">{Math.round(n.lo)}°</td>
                  <td>{n.rain}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div style={{ marginTop: 12 }}>
        <AdSlot slot={AD_SLOTS.afterSummary} />
      </div>

      <section className="card seo-text" style={{ marginTop: 12 }}>
        <h2>{T.wear[l]}</h2>
        <p>
          <b>{T.day[l]}</b> ({degrees(seoul.hi, l)}): {clothes(seoul.hi, l)}
        </p>
        <p>
          <b>{T.night[l]}</b> ({degrees(seoul.lo, l)}): {clothes(seoul.lo, l)}
        </p>
        <h2 style={{ marginTop: 16 }}>{fill(T.notes[l], { m: mn })}</h2>
        <ul>
          {monthNotes("seoul", m, l).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p>
          <Link href={localePath(l, "/")} className="km-cta">
            {T.cta[l]}
          </Link>
        </p>
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{T.months[l]}</h2>
        <nav className="place-links">
          {Array.from({ length: 12 }, (_, i) => i + 1)
            .filter((x) => x !== m)
            .map((x) => (
              <Link key={x} href={localePath(l, `/korea/${x}`)}>
                {l === "en" ? monthName(x, l).slice(0, 3) : monthName(x, l)}
              </Link>
            ))}
        </nav>
      </section>
    </>
  );
}
