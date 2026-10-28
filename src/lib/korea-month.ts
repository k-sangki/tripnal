import climateKr from "@/data/climate-kr.json";
import climate from "@/data/climate.json";
import type { Locale } from "@/lib/i18n";
import { clothesFor, type MonthNormal } from "@/lib/climate";
import { distanceKm, getPlace, type Place } from "@/lib/places";

/**
 * 국내 도시의 월별 평년 날씨 페이지 (/weather/{slug}/{1-12}, /en/…, /ja/…, /zh/…).
 * 방한 외국인은 몇 달 전부터 "Seoul weather in November", "ソウル 11月 服装"으로 찾는데,
 * 16일 예보로는 답할 수 없어서 기상청 관측 평년값(1991~2020)과 계절 안내로 답한다.
 */
const KR = (climateKr as { places: Record<string, { months: MonthNormal[]; station: number; years: number[] | null }> }).places;
const OVERSEAS = (climate as { places: Record<string, { months: MonthNormal[] }> }).places;
/**
 * 비교 기준 도시의 월평균 기온(°C). 일본어판은 도쿄, 중국어(번체)판은 타이베이.
 * 도쿄는 NASA 자료(climate.json)가 일본 기상청 평년값과 잘 맞지만, 타이베이는 격자 탓에 겨울이 1~2°C 높게 나와서
 * 대만 중앙기상서 평년값(1991~2020, 타이베이 관측소 월평균)을 쓴다.
 */
const TAIPEI_MEAN = [16.1, 16.6, 18.5, 21.9, 25.2, 27.7, 29.6, 29.3, 27.6, 24.6, 21.6, 17.9];
const HOME_MEAN: Partial<Record<Locale, number[] | undefined>> = {
  ja: OVERSEAS.tokyo?.months.map((t) => (t.hi + t.lo) / 2),
  zh: TAIPEI_MEAN,
};

export const KOREA_MONTH_CITIES = Object.keys(KR);

/** 이보다 먼 장소는 가까운 도시의 평년값으로 안내하지 않는다 */
const NEAR_KM = 40;

/**
 * 장소 페이지에서 링크할 월별 날씨 도시. 도시 자신이면 km 0, 아니면 40km 안의 가장 가까운 도시.
 * 산·스키장은 해발 고도 탓에 아래 도시 평년값과 많이 달라서 넣지 않는다.
 */
export function monthCityFor(place: Place): { slug: string; km: number } | null {
  if (KR[place.slug]) return { slug: place.slug, km: 0 };
  if (place.leisure === "hiking" || place.leisure === "ski") return null;
  let best: { slug: string; km: number } | null = null;
  for (const slug of KOREA_MONTH_CITIES) {
    const c = getPlace(slug);
    if (!c) continue;
    const km = distanceKm(place, c);
    if (km <= NEAR_KM && (!best || km < best.km)) best = { slug, km };
  }
  return best;
}

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
  return l === "en" ? MONTH_EN[m - 1] : l === "ja" || l === "zh" ? `${m}月` : `${m}월`;
}

const f = (c: number) => Math.round((c * 9) / 5 + 32);

/** "12°C" (영어는 "12°C / 54°F") */
export function degrees(c: number, l: Locale): string {
  return l === "en" ? `${Math.round(c)}°C / ${f(c)}°F` : `${Math.round(c)}°C`;
}

const CLOTHES: Record<"en" | "ja" | "zh", [number, string][]> = {
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
  zh: [
    [28, "短袖、短褲、透氣亞麻衣"],
    [23, "短袖、薄襯衫、薄長褲"],
    [20, "長袖上衣、薄針織外套"],
    [17, "薄毛衣或大學T"],
    [12, "夾克、針織外套、牛仔褲"],
    [9, "風衣或軍裝外套、毛衣"],
    [5, "大衣、發熱衣"],
    [-5, "羽絨外套或厚大衣、圍巾"],
    [-Infinity, "長版羽絨、發熱衣褲、保暖靴、耳罩"],
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
    { ko: "1년 중 가장 추운 달이에요. 한파가 오면 서울 아침이 영하 10°C 아래로 내려가요.", en: "The coldest month. During cold snaps Seoul mornings drop below −10°C (14°F).", ja: "1年でいちばん寒い月。寒波が来るとソウルの朝は氷点下10℃を下回ります。" , zh: "一年中最冷的月份。寒流來時，首爾早上會降到零下10℃以下。" },
    { ko: "공기가 아주 건조해요. 보습제와 립밤을 챙기세요.", en: "The air is very dry, so pack moisturizer and lip balm.", ja: "空気がとても乾燥します。保湿クリームとリップを忘れずに。" , zh: "空氣非常乾燥，記得帶乳液和護唇膏。" },
    { ko: "스키장 성수기예요.", en: "Peak ski season at the resorts in Gangwon.", ja: "江原道のスキー場はハイシーズンです。" , zh: "江原道滑雪場的旺季。" },
  ],
  2: [
    { ko: "아직 한겨울이에요. 설 연휴(1~2월)에는 문을 닫는 가게와 붐비는 교통편에 주의하세요.", en: "Still deep winter. Around Lunar New Year (Jan or Feb) many shops close and trains and buses sell out.", ja: "まだ真冬です。旧正月（1〜2月）の連休は休む店が多く、交通機関も混み合います。" , zh: "仍是隆冬。農曆新年（1～2月）連假期間很多店休息，車票也容易賣光。" },
    { ko: "강릉·속초 등 동해안은 2월에 큰 눈이 자주 와요.", en: "The east coast (Gangneung, Sokcho) often gets its heaviest snow in February.", ja: "江陵・束草など東海岸は2月に大雪になりやすいです。" , zh: "江陵、束草等東海岸常在2月下大雪。" },
  ],
  3: [
    { ko: "봄이 시작되지만 아침은 아직 쌀쌀해요. 하루 기온 차가 커요.", en: "Spring starts, but mornings are still chilly and the gap between day and night is large.", ja: "春になりますが朝はまだ肌寒く、1日の寒暖差が大きいです。" , zh: "春天開始了，但早上還很冷，日夜溫差大。" },
    { ko: "황사·미세먼지가 많아지는 때예요. 마스크(KF94)를 챙기세요.", en: "Yellow dust and fine dust season begins. Bring a KF94 or N95 mask and check air quality daily.", ja: "黄砂・PM2.5が増える時期。KF94マスクを用意して、毎日大気の状態を確認しましょう。" , zh: "黃沙、懸浮微粒變多的季節，請準備KF94口罩並每天確認空氣品質。" },
    { ko: "제주는 3월 말에 유채꽃과 벚꽃이 피기 시작해요.", en: "Jeju's canola flowers and first cherry blossoms appear in late March.", ja: "済州島では3月末に菜の花と桜が咲き始めます。" , zh: "濟州島3月底開始有油菜花和櫻花。" },
  ],
  4: [
    { ko: "벚꽃의 달이에요. 부산·제주는 3월 말~4월 초, 서울은 4월 초~중순이 절정이에요.", en: "Cherry blossom month: late March to early April in Busan and Jeju, early to mid April in Seoul.", ja: "桜の季節。釜山・済州は3月末〜4月初め、ソウルは4月初め〜中旬が見頃です。" , zh: "櫻花季：釜山、濟州在3月底～4月初，首爾在4月初～中旬最盛。" },
    { ko: "낮에는 따뜻해도 저녁엔 쌀쌀해요. 겉옷을 챙기세요.", en: "Warm afternoons, cool evenings: bring a layer.", ja: "昼は暖かくても夜は冷えます。羽織るものを持っていきましょう。" , zh: "白天溫暖、晚上偏涼，記得帶件外套。" },
    { ko: "황사가 가장 잦은 때예요.", en: "Yellow dust is most frequent in April.", ja: "黄砂がいちばん多い時期です。" , zh: "4月是黃沙最多的時候。" },
  ],
  5: [
    { ko: "여행하기 가장 좋은 달 중 하나예요. 맑고 덥지 않아요.", en: "One of the best months to visit: mostly sunny and not yet hot.", ja: "旅行にいちばんいい月のひとつ。晴れが多く、まだ暑くありません。" , zh: "最適合旅遊的月份之一：晴天多，還不熱。" },
    { ko: "석가탄신일 무렵 연등 행사가 열려요.", en: "Lantern festivals light up Seoul around Buddha's Birthday.", ja: "釈迦誕生日の頃、ソウルでは燃灯祭が開かれます。" , zh: "佛誕日前後，首爾有燃燈會。" },
  ],
  6: [
    { ko: "더워지기 시작해요. 6월 하순부터 장마가 시작돼요(제주는 중순).", en: "It's getting hot. The rainy season (jangma) starts in late June, mid June on Jeju.", ja: "暑くなり始めます。6月下旬から梅雨（チャンマ）入り、済州は中旬からです。" , zh: "開始變熱。6月下旬進入梅雨季（韓國稱「長魔」），濟州在中旬。" },
    { ko: "자외선이 강해요. 선크림과 모자를 챙기세요.", en: "UV is strong: sunscreen and a hat help.", ja: "紫外線が強いので日焼け止めと帽子を。" , zh: "紫外線很強，帶防曬乳和帽子。" },
  ],
  7: [
    { ko: "장마로 비가 가장 많은 달이에요. 하루에 100mm 넘게 오는 날도 있어요.", en: "The wettest month: monsoon downpours can bring over 100 mm (4 in) in a day.", ja: "梅雨で雨がいちばん多い月。1日に100mmを超える日もあります。" , zh: "一年中雨最多的月份，梅雨豪雨一天可能超過100mm。" },
    { ko: "장마가 끝나는 7월 하순부터 무덥고 습해요.", en: "After the rains end in late July, it turns hot and very humid.", ja: "梅雨が明ける7月下旬からは蒸し暑くなります。" , zh: "7月下旬梅雨結束後，天氣又熱又悶。" },
  ],
  8: [
    { ko: "가장 덥고 습한 달이에요. 열대야가 이어지고 한낮엔 실내 일정을 넣으세요.", en: "The hottest, most humid month, with warm nights. Plan indoor sights for midday.", ja: "いちばん暑く湿度も高い月。熱帯夜が続くので、日中は屋内の観光を。" , zh: "最熱最潮濕的月份，夜裡也很熱。中午建議安排室內行程。" },
    { ko: "태풍이 올 수 있어요. 출발 전 예보를 꼭 확인하세요.", en: "Typhoons are possible. Check the forecast before you fly.", ja: "台風が来ることがあります。出発前に予報を確認しましょう。" , zh: "可能有颱風，出發前務必確認預報。" },
    { ko: "해수욕장 성수기예요.", en: "Peak beach season.", ja: "海水浴のハイシーズンです。" , zh: "海水浴場旺季。" },
  ],
  9: [
    { ko: "9월 초까지는 덥고 태풍이 올 수 있어요. 중순부터 선선해져요.", en: "Hot with typhoon risk in early September; pleasant from mid month.", ja: "9月初めまでは暑く台風の恐れも。中旬から過ごしやすくなります。" , zh: "9月初仍熱且可能有颱風，中旬起變得舒適。" },
    { ko: "추석 연휴(9~10월)에는 교통편이 붐비고 문 닫는 곳이 있어요.", en: "Around Chuseok (Sep or Oct) transport is packed and some places close.", ja: "秋夕（チュソク、9〜10月）の連休は交通機関が混み、休む店もあります。" , zh: "中秋（秋夕，9～10月）連假期間交通擁擠，部分店家休息。" },
  ],
  10: [
    { ko: "맑은 날이 가장 많은 달이에요. 여행하기 가장 좋아요.", en: "The clearest month of the year and the best time to visit.", ja: "1年でいちばん晴れの日が多く、旅行にぴったりの月です。" , zh: "一年中晴天最多的月份，最適合旅遊。" },
    { ko: "단풍이 설악산에서 10월 초, 서울은 10월 말부터 들어요.", en: "Autumn leaves start on Seoraksan in early October and reach Seoul by late October.", ja: "紅葉は雪嶽山で10月初め、ソウルは10月末から始まります。" , zh: "楓葉10月初從雪嶽山開始，首爾在10月底。" },
    { ko: "아침저녁은 쌀쌀해요. 가벼운 겉옷을 챙기세요.", en: "Mornings and evenings are cool; bring a light jacket.", ja: "朝晩は冷えるので、軽い上着を。" , zh: "早晚偏涼，帶件薄外套。" },
  ],
  11: [
    { ko: "11월 초는 도시 단풍의 절정이에요.", en: "Early November is peak autumn foliage in the cities.", ja: "11月初めは都市部の紅葉の見頃です。" , zh: "11月初是城市楓葉最美的時候。" },
    { ko: "하순부터 빠르게 추워져요. 첫 얼음이 얼고 패딩을 입기 시작해요.", en: "It gets cold fast in late November: first frost, and locals switch to puffer jackets.", ja: "下旬から一気に寒くなり、初氷が張ってダウンを着る人が増えます。" , zh: "下旬會快速變冷：開始結冰，韓國人也換上羽絨外套。" },
  ],
  12: [
    { ko: "춥고 건조해요. 바람이 불면 체감온도가 훨씬 낮아요.", en: "Cold and dry, and the wind makes it feel much colder.", ja: "寒くて乾燥します。風があると体感温度はかなり下がります。" , zh: "又冷又乾，起風時體感溫度會低很多。" },
    { ko: "연말 조명 행사가 많고 스키장이 문을 열어요.", en: "Christmas lights everywhere, and ski resorts open for the season.", ja: "年末のイルミネーションが多く、スキー場もオープンします。" , zh: "到處都有聖誕燈飾，滑雪場也開始營業。" },
  ],
};

/** 바다와 태풍 길목에 있는 남해안·제주 */
const TYPHOON_COAST = new Set(["busan", "jeju", "yeosu"]);

export function monthNotes(slug: string, m: number, l: Locale): string[] {
  const notes = NOTES[m].map((t) => t[l]);
  if (TYPHOON_COAST.has(slug) && (m === 8 || m === 9)) {
    notes.push(
      { ko: "남해안·제주는 태풍 길목이라 배·비행기가 결항될 수 있어요.", en: "This coast is on the typhoon track: ferries and flights can be cancelled.", ja: "南海岸・済州は台風の通り道で、船や飛行機が欠航することがあります。", zh: "南海岸和濟州位在颱風路徑上，船班和航班可能停駛。" }[l],
    );
  }
  return notes;
}

/** 일본어판은 도쿄, 중국어판은 타이베이와 비교 (자기 동네 기준으로 옷차림을 가늠하기 쉽게). 낮·밤 평균 차이 °C */
export function vsHome(n: MonthNormal, m: number, l: Locale): number | null {
  const t = HOME_MEAN[l]?.[m - 1];
  if (t == null) return null;
  return Math.round(((n.hi + n.lo) / 2 - t) * 10) / 10;
}

function hook(n: MonthNormal, l: Locale): string {
  if (n.lo < 0) return { ko: "패딩 꺼낼 각?", en: "Puffer Jacket Time?", ja: "ダウンはいる？", zh: "羽絨衣要帶嗎？" }[l];
  if (n.hi >= 28) return { ko: "땀범벅 각?", en: "How Sweaty Does It Get?", ja: "汗だく覚悟？", zh: "會熱到融化嗎？" }[l];
  if (n.rain >= 250) return { ko: "장마 우산 필수?", en: "Monsoon Survival Tips", ja: "傘は必須？", zh: "雨傘必帶？" }[l];
  return { ko: "겉옷 챙길 각?", en: "Jacket or No Jacket?", ja: "上着はいる？", zh: "要帶外套嗎？" }[l];
}

/** 검색 제목: "○○ ○월 날씨" + 옷차림 + 훅 */
export function monthTitle(name: string, m: number, n: MonthNormal, l: Locale): string {
  if (l === "en") return `${name} Weather in ${MONTH_EN[m - 1]} · What to Wear (${hook(n, l)})`;
  if (l === "ja") {
    const d = vsHome(n, m, l);
    const tail = d == null || Math.abs(d) < 1 ? hook(n, l) : `東京より${Math.round(Math.abs(d))}℃${d < 0 ? "寒い" : "暖かい"}？`;
    return `${name} ${m}月の気温・天気と服装｜${tail}`;
  }
  if (l === "zh") {
    const d = vsHome(n, m, l);
    const tail = d == null || Math.abs(d) < 1 ? hook(n, l) : `比台北${d < 0 ? "冷" : "熱"}${Math.round(Math.abs(d))}℃？`;
    return `${name}${m}月天氣・氣溫與穿搭｜${tail}`;
  }
  return `${name} ${m}월 날씨 · 옷차림 뭐 입지? ${hook(n, l)}`;
}

export function monthDescription(name: string, m: number, n: MonthNormal, l: Locale): string {
  const hi = Math.round(n.hi);
  const lo = Math.round(n.lo);
  if (l === "en")
    return `What's the weather like in ${name} in ${MONTH_EN[m - 1]}? Average high ${hi}°C (${f(n.hi)}°F), low ${lo}°C (${f(n.lo)}°F), ${n.rain} mm of rain. What to wear, seasonal tips and the live 16-day forecast.`;
  if (l === "zh") return `${name}${m}月天氣：平均最高${hi}℃、最低${lo}℃、雨量${n.rain}mm。${m}月去韓國穿什麼、要注意什麼，還有最新16天預報一次看。`;
  if (l === "ja") return `${name}の${m}月の天気は、平均最高気温${hi}℃、最低気温${lo}℃、降水量${n.rain}mm。${m}月の韓国旅行の服装の目安と注意点、最新の2週間予報もまとめてチェック。`;
  return `${name} ${m}월 평년 날씨는 낮 최고 ${hi}°C, 아침 최저 ${lo}°C, 강수량 ${n.rain}mm. ${m}월 여행·나들이 옷차림과 알아 둘 날씨, 이번주·주말 예보까지 한 번에.`;
}

/**
 * 한국 전체 ○월 페이지 (/ja/korea/11 등, 외국어만). 일본에서 "韓国 11月 気温"이 달마다 수천 번 검색되는데
 * 도시 이름 없이 찾는 사람에게는 서울 기준 기온 + 도시별 표로 답한다 (키워드 플래너, 2026-10-28).
 */
export function countryMonthTitle(m: number, l: Locale): string {
  const n = KR.seoul.months[m - 1];
  const d = vsHome(n, m, l);
  if (l === "ja") {
    const tail = d == null || Math.abs(d) < 1 ? hook(n, l) : `ソウルは東京より${Math.round(Math.abs(d))}℃${d < 0 ? "寒い" : "暖かい"}？`;
    return `韓国 ${m}月の気温と服装・${tail}`;
  }
  if (l === "zh") {
    const tail = d == null || Math.abs(d) < 1 ? hook(n, l) : `首爾比台北${d < 0 ? "冷" : "熱"}${Math.round(Math.abs(d))}℃？`;
    return `韓國${m}月天氣・氣溫與穿搭｜${tail}`;
  }
  return `Korea Weather in ${MONTH_EN[m - 1]} · Temperatures & What to Wear (${hook(n, "en")})`;
}

export function countryMonthDescription(m: number, l: Locale): string {
  const t = (slug: string) => {
    const n = KR[slug].months[m - 1];
    return [Math.round(n.hi), Math.round(n.lo)];
  };
  const [sh, sl] = t("seoul");
  const [bh, bl] = t("busan");
  const [jh, jl] = t("jeju");
  if (l === "ja")
    return `${m}月の韓国の気温は、ソウル最高${sh}℃・最低${sl}℃、釜山${bh}℃/${bl}℃、済州島${jh}℃/${jl}℃。${m}月の韓国旅行の服装と注意点を、10都市の平年値でまとめました。`;
  if (l === "zh") return `${m}月韓國天氣與氣溫：首爾最高${sh}℃、最低${sl}℃，釜山${bh}℃/${bl}℃，濟州${jh}℃/${jl}℃。用10個城市的平均值整理${m}月去韓國怎麼穿、要注意什麼。`;
  return `How warm is Korea in ${MONTH_EN[m - 1]}? Seoul averages ${sh}°C / ${sl}°C, Busan ${bh}°C / ${bl}°C, Jeju ${jh}°C / ${jl}°C. What to wear and seasonal tips, with averages for 10 cities.`;
}
