import type { PlaceText } from "@/data/places-i18n";
import type { ForeignLocale } from "@/lib/i18n";
import type { LeisureId } from "@/lib/leisure";
import { presetPeriod, inPeriod } from "@/lib/period";
import type { Place } from "@/lib/places";
import { kstDate, shortDate } from "@/lib/time";
import { codeLabel } from "@/lib/weather/codes";
import type { Forecast } from "@/lib/weather/types";

/**
 * 외국어 장소 페이지의 활동. 등산·스키 말고는 모두 "여행"으로 본다
 * (속초·여수처럼 한국어판은 낚시 장소여도 외국인은 관광으로 찾는다).
 */
export function foreignLeisure(p: Pick<Place, "leisure">): LeisureId {
  return p.leisure === "hiking" || p.leisure === "ski" ? p.leisure : "travel";
}

/** 제목에 쓰는 짧은 이름: "Seoraksan (Daecheongbong Peak)" → "Seoraksan", "雪嶽山（大青峰）" → "雪嶽山" */
export function shortName(name: string): string {
  return name.replace(/\s*[（(].*$/, "");
}

const isBeach = (t: PlaceText) => /Beach|ビーチ|海灘|海水浴場/.test(t.name);

/**
 * 영어·일본어 검색 제목. 한국어와 같은 규칙: 맨 앞은 사람들이 치는 검색어("Seoul weather", "ソウル 天気"),
 * 뒤는 누르고 싶게 하는 훅. 일본어는 "16日"이 16일자로 읽히니 "2週間"으로 쓴다 (영어 "16-day", 중국어 "16天"은 뜻이 분명해서 쓴다).
 */
export function foreignTitle(p: Place, t: PlaceText, l: ForeignLocale): string {
  const s = shortName(t.name);
  const leisure = foreignLeisure(p);
  const elev = p.elevation?.toLocaleString("en-US");
  if (l === "en") {
    if (leisure === "hiking") return `${s} Weather · Summit Wind Chill, Will It Freeze You?${elev ? ` (${elev} m)` : ""}`;
    if (leisure === "ski") return `${s} Weather · Ski Forecast & Snow, Powder Day or Ice Rink?`;
    if (isBeach(t)) return `${t.name} Weather · 16-Day Forecast, Beach Day or Selfie Fail?`;
    return `${t.name} Weather · 16-Day Forecast & What to Wear (Umbrella Needed?)`;
  }
  if (l === "zh") {
    if (leisure === "hiking") return `${s}天氣・山頂體感溫度幾度？登山前看16天預報${p.elevation ? `（海拔${elev}公尺）` : ""}`;
    if (leisure === "ski") return `${s}天氣・滑雪場降雪預報｜粉雪日是哪天？`;
    if (isBeach(t)) return `${t.name}天氣預報・氣溫｜16天，海邊美照日是哪天？`;
    return `${t.name}天氣預報・氣溫｜16天每3小時，要帶傘嗎？穿搭一次看`;
  }
  if (leisure === "hiking") return `${s}の天気・山頂の体感温度は？登山前に2週間予報${elev ? `（標高${elev}m）` : ""}`;
  if (leisure === "ski") return `${s}の天気・スキー場の雪予報｜パウダーの日はいつ？`;
  if (isBeach(t)) return `${t.name}の天気・気温｜2週間予報、映える海の日はいつ？`;
  return `${t.name}の天気・気温｜2週間予報、傘はいる？服装の目安も`;
}

export function foreignDescription(p: Place, t: PlaceText, l: ForeignLocale): string {
  const leisure = foreignLeisure(p);
  if (l === "en") {
    const extra = leisure === "hiking" ? ", summit-adjusted temperature, gusts and sunrise" : leisure === "ski" ? ", snowfall and freezing levels" : ", sunset times";
    return `${t.name} weather in Korea time: 3-hourly forecast for up to 16 days from three models (ECMWF, GFS, ICON). Rain chance, wind, feels-like temperature${extra}, plus a shareable image.`;
  }
  if (l === "zh") {
    const extra = leisure === "hiking" ? "、山頂修正氣溫、陣風、日出" : leisure === "ski" ? "、積雪、結冰" : "、日落時間";
    return `${t.name}天氣，以韓國時間顯示。綜合ECMWF、GFS、ICON三個模式，最長16天、每3小時預報。降雨機率、風、體感溫度${extra}一目了然，還能存成圖片分享。`;
  }
  const extra = leisure === "hiking" ? "、山頂の補正気温・突風・日の出" : leisure === "ski" ? "、積雪・凍結" : "、日の入り";
  return `${t.name}の天気を韓国時間で。ECMWF・GFS・ICONの3モデルによる3時間ごと・最大2週間の予報。降水確率、風、体感温度${extra}をひと目で、画像で保存・共有もできます。`;
}

/** 검색 키워드 (외국인이 실제로 치는 꼴) */
export function foreignKeywords(t: PlaceText, l: ForeignLocale): string[] {
  const s = shortName(t.name);
  if (l === "zh") return [`${s}天氣`, `${s}天氣預報`, `${s}氣溫`, `${s}天氣預報15天`, `${s}穿搭`];
  return l === "en"
    ? [`${s} weather`, `${s} weather forecast`, `${s} 14 day weather`, `${s} weather this weekend`, `what to wear in ${s}`]
    : [`${s} 天気`, `${s} 天気 2週間`, `${s} 天気 10日間`, `${s} 服装`, `${s} 週末 天気`];
}

const f2 = (c: number) => Math.round((c * 9) / 5 + 32);

/** 서버에서 그리는 요약 문장 (검색엔진도 읽는다). 영어는 °C와 °F를 함께 적는다 */
export function foreignSummary(t: PlaceText, f: Forecast, l: ForeignLocale, now = new Date()): string[] {
  const today = kstDate(now);
  const lines: string[] = [];
  const wk = presetPeriod("weekend", today);
  const weekend = f.days.filter((d) => inPeriod(d.date, wk));
  if (weekend.length) {
    const lo = Math.round(Math.min(...weekend.map((d) => d.tMin ?? 99)));
    const hi = Math.round(Math.max(...weekend.map((d) => d.tMax ?? -99)));
    const rain = Math.round(weekend.reduce((a, d) => a + d.precipSum, 0) * 10) / 10;
    const gust = Math.max(...weekend.map((d) => d.gustMax ?? 0));
    const sky = codeLabel(weekend[0].code, l);
    const dates = weekend.map((d) => shortDate(d.date, l)).join(l === "en" ? " – " : l === "zh" ? "～" : "〜");
    lines.push(
      l === "en"
        ? `This weekend (${dates}) in ${t.name}: ${sky.toLowerCase()}, ${lo}–${hi}°C (${f2(lo)}–${f2(hi)}°F), ${rain} mm of rain and gusts up to ${Math.round(gust * 3.6)} km/h.`
        : l === "zh"
          ? `本週末（${dates}）${t.name}預報${sky}，氣溫${lo}～${hi}℃，雨量${rain}mm，最大陣風${Math.round(gust)}m/s。`
          : `今週末（${dates}）の${t.name}は${sky}、気温${lo}〜${hi}℃、降水量${rain}mm、最大瞬間風速${Math.round(gust)}m/sの予報です。`,
    );
  }
  const dry = f.days.filter((d) => d.precipSum < 1).length;
  lines.push(
    l === "en"
      ? `${dry} of the next ${f.days.length} days look dry. Compare temperature, wind and rain every 3 hours to pick the best day for sightseeing.`
      : l === "zh"
        ? `未來${f.days.length}天中有${dry}天沒有降雨預報。每3小時比較氣溫、風和雨，挑出最適合出遊的一天。`
        : `この先${f.days.length}日のうち雨の予報がない日は${dry}日。気温・風・雨を3時間ごとに比べて、観光にいちばんいい日を選びましょう。`,
  );
  const first = f.days[0];
  if (first?.sunrise && first.sunset) {
    lines.push(
      l === "en"
        ? `Sunrise today is at ${first.sunrise} and sunset at ${first.sunset} (KST).`
        : l === "zh"
          ? `今天日出${first.sunrise}、日落${first.sunset}（韓國時間）。`
          : `今日の日の出は${first.sunrise}、日の入りは${first.sunset}（韓国時間）です。`,
    );
  }
  return lines;
}
