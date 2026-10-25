import Link from "next/link";
import { PLACE_TEXT } from "@/data/places-i18n";
import { localePath, type Locale } from "@/lib/i18n";
import { KOREA_MONTH_CITIES, clothes, degrees, krNormals, krStation, krYears, monthName, monthNotes, vsTokyo } from "@/lib/korea-month";
import { getPlace } from "@/lib/places";
import { shortName } from "@/lib/seo-foreign";
import { AD_SLOTS, AdSlot } from "./AdSlot";

type Text = Record<Locale, string>;

const T = {
  h1: { ko: "{c} {m} 날씨", en: "{c} weather in {m}", ja: "{c} {m}の天気と服装" },
  high: { ko: "낮 최고", en: "Avg high", ja: "平均最高" },
  low: { ko: "아침 최저", en: "Avg low", ja: "平均最低" },
  rain: { ko: "강수량", en: "Rainfall", ja: "降水量" },
  hum: { ko: "습도", en: "Humidity", ja: "湿度" },
  wear: { ko: "옷차림", en: "What to wear", ja: "服装の目安" },
  day: { ko: "낮", en: "Daytime", ja: "日中" },
  night: { ko: "아침·저녁", en: "Morning & night", ja: "朝晩" },
  notes: { ko: "{m}에 알아 둘 것", en: "Good to know in {m}", ja: "{m}に知っておきたいこと" },
  year: { ko: "월별 평년 날씨", en: "Month by month", ja: "月ごとの平年値" },
  month: { ko: "달", en: "Month", ja: "月" },
  forecast: { ko: "{c} 지금 날씨 · 이번주·주말 예보 보기 →", en: "See the live 16-day forecast for {c} →", ja: "{c}の最新2週間予報を見る →" },
  others: { ko: "다른 도시 {m} 날씨", en: "Other cities in {m}", ja: "ほかの都市の{m}" },
  source: {
    ko: "평년값: 기상청 {s}번 관측소 시간별 관측 {y} 평균 (기상청 공식 평년값과는 조금 다를 수 있어요)",
    en: "Climate averages from KMA weather station {s} hourly observations, {y}. They may differ slightly from official KMA normals.",
    ja: "平年値：韓国気象庁 観測所{s}の毎時観測（{y}）の平均。公式の平年値とは少し異なる場合があります。",
  },
  tokyo: { ko: "", en: "", ja: "東京（{t}℃）と比べて{d}" },
} satisfies Record<string, Text>;

function fill(s: string, v: Record<string, string | number>) {
  return s.replace(/\{(\w)\}/g, (_, k) => String(v[k] ?? ""));
}

/** 도시 이름 (외국어는 짧은 이름: "Seoul", "ソウル") */
export function cityName(slug: string, l: Locale): string {
  if (l === "ko") return getPlace(slug)?.name ?? slug;
  return shortName(PLACE_TEXT[slug]?.[l].name ?? slug);
}

/** 국내 도시 월별 평년 날씨 화면 (한국어·영어·일본어 공통) */
export function KoreaMonthPage({ slug, month: m, locale: l }: { slug: string; month: number; locale: Locale }) {
  const normals = krNormals(slug)!;
  const n = normals[m - 1];
  const c = cityName(slug, l);
  const mn = monthName(m, l);
  const years = krYears(slug);
  const d = l === "ja" ? vsTokyo(n, m) : null;
  const tokyoAvg = d == null ? null : Math.round(((n.hi + n.lo) / 2 - d) * 10) / 10;

  return (
    <>
      <section className="card seo-text">
        <h1 style={{ fontSize: 22, margin: "0 0 12px", color: "var(--ink)" }}>{fill(T.h1[l], { c, m: mn })}</h1>
        <div className="km-stats">
          <div>
            <small>{T.high[l]}</small>
            <b className="v-hi">{degrees(n.hi, l)}</b>
          </div>
          <div>
            <small>{T.low[l]}</small>
            <b className="v-lo">{degrees(n.lo, l)}</b>
          </div>
          <div>
            <small>{T.rain[l]}</small>
            <b>{n.rain} mm</b>
          </div>
          <div>
            <small>{T.hum[l]}</small>
            <b>{n.hum}%</b>
          </div>
        </div>
        {d != null && tokyoAvg != null && Math.abs(d) >= 0.5 && (
          <p>{fill(T.tokyo.ja, { t: tokyoAvg, d: `平均気温が約${Math.abs(Math.round(d))}℃${d < 0 ? "低い" : "高い"}です。` })}</p>
        )}
      </section>

      <section className="card seo-text" style={{ marginTop: 12 }}>
        <h2>{T.wear[l]}</h2>
        <p>
          <b>{T.day[l]}</b> ({degrees(n.hi, l)}): {clothes(n.hi, l)}
        </p>
        <p>
          <b>{T.night[l]}</b> ({degrees(n.lo, l)}): {clothes(n.lo, l)}
        </p>
        <h2 style={{ marginTop: 16 }}>{fill(T.notes[l], { m: mn })}</h2>
        <ul>
          {monthNotes(slug, m, l).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p>
          <Link href={localePath(l, `/weather/${slug}`)} className="km-cta">
            {fill(T.forecast[l], { c })}
          </Link>
        </p>
      </section>

      <div style={{ marginTop: 12 }}>
        <AdSlot slot={AD_SLOTS.afterSummary} />
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{T.year[l]}</h2>
        <table className="km-table">
          <thead>
            <tr>
              <th>{T.month[l]}</th>
              <th>{T.high[l]}</th>
              <th>{T.low[l]}</th>
              <th>{T.rain[l]}</th>
            </tr>
          </thead>
          <tbody>
            {normals.map((x, i) => (
              <tr key={i} className={i + 1 === m ? "on" : undefined}>
                <td>
                  <Link href={localePath(l, `/weather/${slug}/${i + 1}`)}>{l === "en" ? monthName(i + 1, l).slice(0, 3) : monthName(i + 1, l)}</Link>
                </td>
                <td className="v-hi">{Math.round(x.hi)}°</td>
                <td className="v-lo">{Math.round(x.lo)}°</td>
                <td>{x.rain}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {years && <p className="muted">{fill(T.source[l], { s: krStation(slug) ?? "", y: `${years[0]}–${years[1]}` })}</p>}
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{fill(T.others[l], { m: mn })}</h2>
        <nav className="place-links">
          {KOREA_MONTH_CITIES.filter((s) => s !== slug).map((s) => (
            <Link key={s} href={localePath(l, `/weather/${s}/${m}`)}>
              {cityName(s, l)}
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
