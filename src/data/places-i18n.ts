import type { ForeignLocale } from "@/lib/i18n";

export interface PlaceText {
  name: string;
  region: string;
  /** 페이지 아래 소개 한두 문장: 외국인 여행자가 그곳 날씨를 왜 보는지 */
  about: string;
}

/**
 * 영어·일본어 장소 페이지가 있는 곳 (방한 외국인이 실제로 많이 가는 곳부터).
 * 이름은 한국관광공사 표기를 따르고, 일본어는 일본 여행 안내에서 흔히 쓰는 표기(한자+읽기)로 적었다.
 */
export const PLACE_TEXT: Record<string, Record<ForeignLocale, PlaceText>> = {
  seoul: {
    en: { name: "Seoul", region: "Seoul, South Korea", about: "Palaces, Myeong-dong shopping and Han River parks: most of a Seoul trip is outdoors, so rain and wind matter more than you think." },
    ja: { name: "ソウル", region: "韓国・ソウル特別市", about: "明洞や弘大での買い物、景福宮、漢江公園など、ソウル観光は歩く時間が長いので、雨と風のチェックが欠かせません。" },
  },
  busan: {
    en: { name: "Busan", region: "Busan, South Korea", about: "Beaches, Gamcheon Culture Village and seafood markets. Busan sits on the coast, so sea wind can make it feel colder than Seoul in winter." },
    ja: { name: "釜山", region: "韓国・釜山広域市", about: "海雲台や甘川文化村、チャガルチ市場など見どころが海沿いに多く、冬は海風で体感温度が下がります。" },
  },
  jeju: {
    en: { name: "Jeju", region: "Jeju-si, Jeju Island", about: "Jeju's weather changes fast and the north and south of the island can differ. Check wind before planning a coastal drive or a ferry to Udo." },
    ja: { name: "済州", region: "韓国・済州島 済州市", about: "済州島は天気が変わりやすく、島の北と南で天気が違うことも。海沿いのドライブや牛島行きの船の前には風を確認しましょう。" },
  },
  incheon: {
    en: { name: "Incheon", region: "Incheon, South Korea", about: "Home of Incheon Airport, Chinatown and Songdo. Useful for checking fog and wind on arrival and departure days." },
    ja: { name: "仁川", region: "韓国・仁川広域市", about: "仁川空港やチャイナタウン、松島がある街。到着日・出発日の霧や風の確認に。" },
  },
  gyeongju: {
    en: { name: "Gyeongju", region: "Gyeongju, North Gyeongsang", about: "The old Silla capital, with Bulguksa Temple and Daereungwon. Spring cherry blossoms and autumn leaves are the busiest times." },
    ja: { name: "慶州", region: "韓国・慶尚北道 慶州市", about: "仏国寺や大陵苑がある新羅の古都。春の桜と秋の紅葉の時期が特に人気です。" },
  },
  gangneung: {
    en: { name: "Gangneung", region: "Gangneung, Gangwon", about: "East coast beaches, coffee street and sunrise spots. The east coast can be sunny while Seoul is cloudy, and the other way round." },
    ja: { name: "江陵", region: "韓国・江原特別自治道 江陵市", about: "東海岸の海辺やカフェ通り、日の出スポットで人気。ソウルと東海岸で天気が逆になることもあります。" },
  },
  sokcho: {
    en: { name: "Sokcho", region: "Sokcho, Gangwon", about: "Gateway to Seoraksan, with a beach and a busy seafood market. Wind off the sea is strong in winter and spring." },
    ja: { name: "束草", region: "韓国・江原特別自治道 束草市", about: "雪嶽山の玄関口で、ビーチと海鮮市場が人気。冬から春は海からの風が強めです。" },
  },
  jeonju: {
    en: { name: "Jeonju", region: "Jeonju, North Jeolla", about: "Famous for bibimbap and its hanok village. Inland Jeonju gets hot summers and cold winter mornings." },
    ja: { name: "全州", region: "韓国・全北特別自治道 全州市", about: "ビビンバと韓屋村で有名な街。内陸なので夏は暑く、冬の朝は冷え込みます。" },
  },
  daegu: {
    en: { name: "Daegu", region: "Daegu, South Korea", about: "One of Korea's hottest cities in summer, with Seomun Market and Palgongsan nearby." },
    ja: { name: "大邱", region: "韓国・大邱広域市", about: "夏は韓国でも特に暑くなる街。西門市場や八公山が近くにあります。" },
  },
  yeosu: {
    en: { name: "Yeosu", region: "Yeosu, South Jeolla", about: "A south coast port known for night sea views, the cable car and island hopping. Check wind before boat trips." },
    ja: { name: "麗水", region: "韓国・全羅南道 麗水市", about: "夜の海の景色とケーブルカー、島めぐりで知られる南海岸の港町。船に乗る前は風を確認しましょう。" },
  },
  "haeundae-beach": {
    en: { name: "Haeundae Beach", region: "Haeundae-gu, Busan", about: "Busan's most famous beach. Swimming season is roughly July to August; outside it, look for clear days for photos and walks." },
    ja: { name: "海雲台ビーチ", region: "韓国・釜山 海雲台区", about: "釜山を代表するビーチ。海水浴は7〜8月ごろ、それ以外の季節は写真や散歩に向く晴れの日をチェック。" },
  },
  "gwangalli-beach": {
    en: { name: "Gwangalli Beach", region: "Suyeong-gu, Busan", about: "Best known for the lit-up Gwangan Bridge at night. Clear, calm evenings give the best view." },
    ja: { name: "広安里ビーチ", region: "韓国・釜山 水営区", about: "夜にライトアップされる広安大橋で有名。晴れて風の弱い夜がいちばんきれいに見えます。" },
  },
  "hyeopjae-beach": {
    en: { name: "Hyeopjae Beach", region: "Hallim-eup, Jeju", about: "Emerald water on Jeju's west coast. The colour of the sea is at its best on sunny, low-wind days." },
    ja: { name: "挟才ビーチ", region: "韓国・済州島 翰林邑", about: "済州島西側のエメラルド色の海。晴れて風の弱い日に海の色がいちばん映えます。" },
  },
  seongsanpo: {
    en: { name: "Seongsan Ilchulbong", region: "Seongsan-eup, Seogwipo, Jeju", about: "The sunrise peak and ferry port for Udo Island. Sunrise times and wind for the ferry are on this page." },
    ja: { name: "城山日出峰", region: "韓国・済州島 西帰浦市 城山邑", about: "日の出の名所で、牛島行きの船が出る港町。日の出の時刻と船に関わる風をこのページで確認できます。" },
  },
  "jeonju-hanok-village": {
    en: { name: "Jeonju Hanok Village", region: "Jeonju, North Jeolla", about: "Over 700 traditional houses, popular for walking in hanbok. Most of the visit is outdoors on foot." },
    ja: { name: "全州韓屋村", region: "韓国・全北特別自治道 全州市", about: "700軒以上の韓屋が並び、韓服を着て歩く人に人気。ほとんど屋外を歩いて回ります。" },
  },
  andong: {
    en: { name: "Andong", region: "Andong, North Gyeongsang", about: "Hahoe Folk Village and the mask dance festival in autumn. Mornings in the valley can be foggy." },
    ja: { name: "安東", region: "韓国・慶尚北道 安東市", about: "河回村と秋の仮面舞踊祭で知られる街。谷あいなので朝は霧が出ることもあります。" },
  },
  suwon: {
    en: { name: "Suwon", region: "Suwon, Gyeonggi", about: "Hwaseong Fortress, a UNESCO site an hour from Seoul. The fortress walk is about 6 km and fully outdoors." },
    ja: { name: "水原", region: "韓国・京畿道 水原市", about: "ソウルから1時間ほどの世界遺産、水原華城の街。城壁一周は約6kmで、すべて屋外です。" },
  },
  "seoraksan-daecheongbong": {
    en: { name: "Seoraksan (Daecheongbong Peak)", region: "Seoraksan National Park, Gangwon", about: "Korea's most famous autumn foliage mountain. Temperatures here are for the 1,708 m summit, which is far colder and windier than Sokcho below." },
    ja: { name: "雪嶽山（大青峰）", region: "韓国・江原特別自治道 雪嶽山国立公園", about: "韓国でいちばん有名な紅葉の山。ここの気温は標高1,708mの山頂の値で、ふもとの束草よりずっと寒く風も強いです。" },
  },
  hallasan: {
    en: { name: "Hallasan (Baengnokdam Summit)", region: "Hallasan National Park, Jeju", about: "South Korea's highest peak at 1,947 m. Trails close in heavy snow or rain, and the summit can be below freezing when the coast is mild." },
    ja: { name: "漢拏山（白鹿潭）", region: "韓国・済州島 漢拏山国立公園", about: "標高1,947mの韓国最高峰。大雪や大雨では入山規制があり、海辺が暖かくても山頂は氷点下のことがあります。" },
  },
  "bukhansan-baegundae": {
    en: { name: "Bukhansan (Baegundae Peak)", region: "Bukhansan National Park, Seoul", about: "A granite peak you can reach by subway from central Seoul. Rocks near the top get slippery after rain or frost." },
    ja: { name: "北漢山（白雲台）", region: "韓国・ソウル 北漢山国立公園", about: "ソウル市内から地下鉄で行ける岩山。雨や霜のあとは山頂付近の岩が滑りやすくなります。" },
  },
  "jirisan-cheonwangbong": {
    en: { name: "Jirisan (Cheonwangbong Peak)", region: "Jirisan National Park, South Gyeongsang", about: "Mainland Korea's highest peak at 1,915 m, usually climbed with an overnight shelter stay. Check summit wind chill before you go." },
    ja: { name: "智異山（天王峰）", region: "韓国・慶尚南道 智異山国立公園", about: "標高1,915mの韓国本土最高峰で、山小屋に泊まって登るのが一般的。出発前に山頂の体感温度を確認しましょう。" },
  },
  yongpyong: {
    en: { name: "Yongpyong Resort", region: "Pyeongchang, Gangwon", about: "Korea's largest ski resort and a 2018 Winter Olympics venue. The season usually runs from late November to March." },
    ja: { name: "龍平リゾート", region: "韓国・江原特別自治道 平昌郡", about: "韓国最大級のスキー場で、2018年平昌五輪の会場。シーズンはふつう11月下旬から3月までです。" },
  },
  "phoenix-pyeongchang": {
    en: { name: "Phoenix Pyeongchang", region: "Pyeongchang, Gangwon", about: "Ski and snowboard resort that hosted Olympic freestyle and snowboard events, about two hours from Seoul." },
    ja: { name: "フェニックス平昌", region: "韓国・江原特別自治道 平昌郡", about: "平昌五輪のフリースタイル・スノーボード会場になったスキー場。ソウルから約2時間です。" },
  },
  high1: {
    en: { name: "High1 Resort", region: "Jeongseon, Gangwon", about: "A high-altitude ski resort in the Taebaek Mountains, often colder and snowier than resorts nearer Seoul." },
    ja: { name: "ハイワンリゾート", region: "韓国・江原特別自治道 旌善郡", about: "太白山脈の標高の高いスキー場で、ソウル近郊のスキー場より寒く雪も多めです。" },
  },
};

export function placeText(slug: string, l: ForeignLocale): PlaceText | undefined {
  return PLACE_TEXT[slug]?.[l];
}

/** 그 장소에 외국어 페이지가 있는지 */
export function hasForeignPage(slug: string): boolean {
  return slug in PLACE_TEXT;
}
