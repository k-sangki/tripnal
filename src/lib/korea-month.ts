import climateKr from "@/data/climate-kr.json";
import climate from "@/data/climate.json";
import type { Locale } from "@/lib/i18n";
import { clothesFor, type MonthNormal } from "@/lib/climate";

/**
 * 국내 도시의 월별 평년 날씨 페이지 (/weather/{slug}/{1-12}, /en/…, /ja/…).
 * 방한 외국인은 몇 달 전부터 "Seoul weather in November", "ソウル 11月 服装"으로 찾는데,
 * 16일 예보로는 답할 수 없어서 기상청 관측 평년값(1991~2020)과 계절 안내로 답한다.
 */
const KR = (climateKr as { places: Record<string, { months: MonthNormal[]; station: number; years: number[] | null }> }).places;
const TOKYO = (climate as { places: Record<string, { months: MonthNormal[] }> }).places.tokyo?.months;

export const KOREA_MONTH_CITIES = Object.keys(KR);

export function krNormals(slug: string): MonthNormal[] | undefined {
  return KR[slug]?.months;
}

/** 기상청 ASOS 관측소 번호 */
export function krStation(slug: string): number | undefined {
  return KR[slug]?.station;
}

export function krYears(slug: string): number[] | null {
  return KR[slug]?.years ?? null;
}

export function parseMonth(s: string): number | null {
  return /^(?:[1-9]|1[0-2])$/.test(s) ? Number(s) : null;
}

export const MONTH_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthName(m: number, l: Locale): string {
  return l === "en" ? MONTH_EN[m - 1] : l === "ja" ? `${m}月` : `${m}월`;
}

const f = (c: number) => Math.round((c * 9) / 5 + 32);

/** "12°C" (영어는 "12°C / 54°F") */
export function degrees(c: number, l: Locale): string {
  return l === "en" ? `${Math.round(c)}°C / ${f(c)}°F` : `${Math.round(c)}°C`;
}

const CLOTHES: Record<"en" | "ja", [number, string][]> = {
  en: [
    [28, "T-shirt, shorts, light linen"],
    [23, "T-shirt, thin shirt, light trousers"],
    [20, "Long-sleeve top, light cardigan"],
    [17, "Light sweater or sweatshirt"],
    [12, "Light jacket, cardigan, jeans"],
    [9, "Trench coat or field jacket, sweater"],
    [5, "Wool coat, thermal base layer"],
    [-5, "Puffer jacket or heavy coat, scarf"],
    [-Infinity, "Long down parka, thermals, warm boots, ear muffs"],
  ],
  ja: [
    [28, "半袖・短パン、リネン素材"],
    [23, "半袖、薄手のシャツ"],
    [20, "長袖Tシャツ、薄手のカーディガン"],
    [17, "薄手のニット、トレーナー"],
    [12, "ジャケット、カーディガン、ジーンズ"],
    [9, "トレンチコート、ニット"],
    [5, "コート、ヒートテック"],
    [-5, "ダウン、厚手のコート、マフラー"],
    [-Infinity, "ロングダウン、防寒インナー、防寒ブーツ、耳当て"],
  ],
};

export function clothes(t: number, l: Locale): string {
  if (l === "ko") return clothesFor(t);
  return CLOTHES[l].find(([min]) => t >= min)![1];
}

type Text = Record<Locale, string>;

/** 달마다 한국 여행에서 알아 둘 것 (전국 공통) */
const NOTES: Record<number, Text[]> = {
  1: [
    { ko: "1년 중 가장 추운 달이에요. 한파가 오면 서울 아침이 영하 10°C 아래로 내려가요.", en: "The coldest month. During cold snaps Seoul mornings drop below −10°C (14°F).", ja: "1年でいちばん寒い月。寒波が来るとソウルの朝は氷点下10℃を下回ります。" },
    { ko: "공기가 아주 건조해요. 보습제와 립밤을 챙기세요.", en: "The air is very dry, so pack moisturizer and lip balm.", ja: "空気がとても乾燥します。保湿クリームとリップを忘れずに。" },
    { ko: "스키장 성수기예요.", en: "Peak ski season at the resorts in Gangwon.", ja: "江原道のスキー場はハイシーズンです。" },
  ],
  2: [
    { ko: "아직 한겨울이에요. 설 연휴(1~2월)에는 문을 닫는 가게와 붐비는 교통편에 주의하세요.", en: "Still deep winter. Around Lunar New Year (Jan or Feb) many shops close and trains and buses sell out.", ja: "まだ真冬です。旧正月（1〜2月）の連休は休む店が多く、交通機関も混み合います。" },
    { ko: "강릉·속초 등 동해안은 2월에 큰 눈이 자주 와요.", en: "The east coast (Gangneung, Sokcho) often gets its heaviest snow in February.", ja: "江陵・束草など東海岸は2月に大雪になりやすいです。" },
  ],
  3: [
    { ko: "봄이 시작되지만 아침은 아직 쌀쌀해요. 하루 기온 차가 커요.", en: "Spring starts, but mornings are still chilly and the gap between day and night is large.", ja: "春になりますが朝はまだ肌寒く、1日の寒暖差が大きいです。" },
    { ko: "황사·미세먼지가 많아지는 때예요. 마스크(KF94)를 챙기세요.", en: "Yellow dust and fine dust season begins. Bring a KF94 or N95 mask and check air quality daily.", ja: "黄砂・PM2.5が増える時期。KF94マスクを用意して、毎日大気の状態を確認しましょう。" },
    { ko: "제주는 3월 말에 유채꽃과 벚꽃이 피기 시작해요.", en: "Jeju's canola flowers and first cherry blossoms appear in late March.", ja: "済州島では3月末に菜の花と桜が咲き始めます。" },
  ],
  4: [
    { ko: "벚꽃의 달이에요. 부산·제주는 3월 말~4월 초, 서울은 4월 초~중순이 절정이에요.", en: "Cherry blossom month: late March to early April in Busan and Jeju, early to mid April in Seoul.", ja: "桜の季節。釜山・済州は3月末〜4月初め、ソウルは4月初め〜中旬が見頃です。" },
    { ko: "낮에는 따뜻해도 저녁엔 쌀쌀해요. 겉옷을 챙기세요.", en: "Warm afternoons, cool evenings: bring a layer.", ja: "昼は暖かくても夜は冷えます。羽織るものを持っていきましょう。" },
    { ko: "황사가 가장 잦은 때예요.", en: "Yellow dust is most frequent in April.", ja: "黄砂がいちばん多い時期です。" },
  ],
  5: [
    { ko: "여행하기 가장 좋은 달 중 하나예요. 맑고 덥지 않아요.", en: "One of the best months to visit: mostly sunny and not yet hot.", ja: "旅行にいちばんいい月のひとつ。晴れが多く、まだ暑くありません。" },
    { ko: "석가탄신일 무렵 연등 행사가 열려요.", en: "Lantern festivals light up Seoul around Buddha's Birthday.", ja: "釈迦誕生日の頃、ソウルでは燃灯祭が開かれます。" },
  ],
  6: [
    { ko: "더워지기 시작해요. 6월 하순부터 장마가 시작돼요(제주는 중순).", en: "It's getting hot. The rainy season (jangma) starts in late June, mid June on Jeju.", ja: "暑くなり始めます。6月下旬から梅雨（チャンマ）入り、済州は中旬からです。" },
    { ko: "자외선이 강해요. 선크림과 모자를 챙기세요.", en: "UV is strong: sunscreen and a hat help.", ja: "紫外線が強いので日焼け止めと帽子を。" },
  ],
  7: [
    { ko: "장마로 비가 가장 많은 달이에요. 하루에 100mm 넘게 오는 날도 있어요.", en: "The wettest month: monsoon downpours can bring over 100 mm (4 in) in a day.", ja: "梅雨で雨がいちばん多い月。1日に100mmを超える日もあります。" },
    { ko: "장마가 끝나는 7월 하순부터 무덥고 습해요.", en: "After the rains end in late July, it turns hot and very humid.", ja: "梅雨が明ける7月下旬からは蒸し暑くなります。" },
  ],
  8: [
    { ko: "가장 덥고 습한 달이에요. 열대야가 이어지고 한낮엔 실내 일정을 넣으세요.", en: "The hottest, most humid month, with warm nights. Plan indoor sights for midday.", ja: "いちばん暑く湿度も高い月。熱帯夜が続くので、日中は屋内の観光を。" },
    { ko: "태풍이 올 수 있어요. 출발 전 예보를 꼭 확인하세요.", en: "Typhoons are possible. Check the forecast before you fly.", ja: "台風が来ることがあります。出発前に予報を確認しましょう。" },
    { ko: "해수욕장 성수기예요.", en: "Peak beach season.", ja: "海水浴のハイシーズンです。" },
  ],
  9: [
    { ko: "9월 초까지는 덥고 태풍이 올 수 있어요. 중순부터 선선해져요.", en: "Hot with typhoon risk in early September; pleasant from mid month.", ja: "9月初めまでは暑く台風の恐れも。中旬から過ごしやすくなります。" },
    { ko: "추석 연휴(9~10월)에는 교통편이 붐비고 문 닫는 곳이 있어요.", en: "Around Chuseok (Sep or Oct) transport is packed and some places close.", ja: "秋夕（チュソク、9〜10月）の連休は交通機関が混み、休む店もあります。" },
  ],
  10: [
    { ko: "맑은 날이 가장 많은 달이에요. 여행하기 가장 좋아요.", en: "The clearest month of the year and the best time to visit.", ja: "1年でいちばん晴れの日が多く、旅行にぴったりの月です。" },
    { ko: "단풍이 설악산에서 10월 초, 서울은 10월 말부터 들어요.", en: "Autumn leaves start on Seoraksan in early October and reach Seoul by late October.", ja: "紅葉は雪嶽山で10月初め、ソウルは10月末から始まります。" },
    { ko: "아침저녁은 쌀쌀해요. 가벼운 겉옷을 챙기세요.", en: "Mornings and evenings are cool; bring a light jacket.", ja: "朝晩は冷えるので、軽い上着を。" },
  ],
  11: [
    { ko: "11월 초는 도시 단풍의 절정이에요.", en: "Early November is peak autumn foliage in the cities.", ja: "11月初めは都市部の紅葉の見頃です。" },
    { ko: "하순부터 빠르게 추워져요. 첫 얼음이 얼고 패딩을 입기 시작해요.", en: "It gets cold fast in late November: first frost, and locals switch to puffer jackets.", ja: "下旬から一気に寒くなり、初氷が張ってダウンを着る人が増えます。" },
  ],
  12: [
    { ko: "춥고 건조해요. 바람이 불면 체감온도가 훨씬 낮아요.", en: "Cold and dry, and the wind makes it feel much colder.", ja: "寒くて乾燥します。風があると体感温度はかなり下がります。" },
    { ko: "연말 조명 행사가 많고 스키장이 문을 열어요.", en: "Christmas lights everywhere, and ski resorts open for the season.", ja: "年末のイルミネーションが多く、スキー場もオープンします。" },
  ],
};

/** 바다와 태풍 길목에 있는 남해안·제주 */
const TYPHOON_COAST = new Set(["busan", "jeju", "yeosu"]);

export function monthNotes(slug: string, m: number, l: Locale): string[] {
  const notes = NOTES[m].map((t) => t[l]);
  if (TYPHOON_COAST.has(slug) && (m === 8 || m === 9)) {
    notes.push(
      { ko: "남해안·제주는 태풍 길목이라 배·비행기가 결항될 수 있어요.", en: "This coast is on the typhoon track: ferries and flights can be cancelled.", ja: "南海岸・済州は台風の通り道で、船や飛行機が欠航することがあります。" }[l],
    );
  }
  return notes;
}

/** 일본어판: 도쿄와 비교 (일본 여행자가 옷차림을 가늠하기 쉽게). 낮·밤 평균 차이 °C */
export function vsTokyo(n: MonthNormal, m: number): number | null {
  const t = TOKYO?.[m - 1];
  if (!t) return null;
  return Math.round(((n.hi + n.lo) / 2 - (t.hi + t.lo) / 2) * 10) / 10;
}

function hook(n: MonthNormal, l: Locale): string {
  if (n.lo < 0) return { ko: "패딩 꺼낼 각?", en: "Puffer Jacket Time?", ja: "ダウンはいる？" }[l];
  if (n.hi >= 28) return { ko: "땀범벅 각?", en: "How Sweaty Does It Get?", ja: "汗だく覚悟？" }[l];
  if (n.rain >= 250) return { ko: "장마 우산 필수?", en: "Monsoon Survival Tips", ja: "傘は必須？" }[l];
  return { ko: "겉옷 챙길 각?", en: "Jacket or No Jacket?", ja: "上着はいる？" }[l];
}

/** 검색 제목: "○○ ○월 날씨" + 옷차림 + 훅 */
export function monthTitle(name: string, m: number, n: MonthNormal, l: Locale): string {
  if (l === "en") return `${name} Weather in ${MONTH_EN[m - 1]} · What to Wear (${hook(n, l)})`;
  if (l === "ja") {
    const d = vsTokyo(n, m);
    const tail = d == null || Math.abs(d) < 1 ? hook(n, l) : `東京より${Math.round(Math.abs(d))}℃${d < 0 ? "寒い" : "暖かい"}？`;
    return `${name} ${m}月の天気と服装・${tail}`;
  }
  return `${name} ${m}월 날씨 · 옷차림 뭐 입지? ${hook(n, l)}`;
}

export function monthDescription(name: string, m: number, n: MonthNormal, l: Locale): string {
  const hi = Math.round(n.hi);
  const lo = Math.round(n.lo);
  if (l === "en")
    return `What's the weather like in ${name} in ${MONTH_EN[m - 1]}? Average high ${hi}°C (${f(n.hi)}°F), low ${lo}°C (${f(n.lo)}°F), ${n.rain} mm of rain. What to wear, seasonal tips and the live 16-day forecast.`;
  if (l === "ja") return `${name}の${m}月の天気は、平均最高気温${hi}℃、最低気温${lo}℃、降水量${n.rain}mm。${m}月の韓国旅行の服装の目安と注意点、最新の2週間予報もまとめてチェック。`;
  return `${name} ${m}월 평년 날씨는 낮 최고 ${hi}°C, 아침 최저 ${lo}°C, 강수량 ${n.rain}mm. ${m}월 여행·나들이 옷차림과 알아 둘 날씨, 이번주·주말 예보까지 한 번에.`;
}
