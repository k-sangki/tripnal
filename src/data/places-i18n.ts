import type { ForeignLocale } from "@/lib/i18n";

export interface PlaceText {
  name: string;
  region: string;
  /** 페이지 아래 소개 한두 문장: 외국인 여행자가 그곳 날씨를 왜 보는지 */
  about: string;
}

/**
 * 영어·일본어·중국어 장소 페이지가 있는 곳 (방한 외국인이 실제로 많이 가는 곳부터).
 * 이름은 한국관광공사 표기를 따르고, 일본어는 일본 여행 안내에서 흔히 쓰는 표기(한자+읽기)로 적었다.
 */
export const PLACE_TEXT: Record<string, Record<ForeignLocale, PlaceText>> = {
  seoul: {
    en: { name: "Seoul", region: "Seoul, South Korea", about: "Palaces, Myeong-dong shopping and Han River parks: most of a Seoul trip is outdoors, so rain and wind matter more than you think." },
    ja: { name: "ソウル", region: "韓国・ソウル特別市", about: "明洞や弘大での買い物、景福宮、漢江公園など、ソウル観光は歩く時間が長いので、雨と風のチェックが欠かせません。" },
    zh: { name: "首爾", region: "韓國・首爾特別市", about: "明洞、弘大逛街，景福宮、漢江公園散步，首爾旅遊大多在戶外走路，下雨和風比想像中更重要。" },
  },
  busan: {
    en: { name: "Busan", region: "Busan, South Korea", about: "Beaches, Gamcheon Culture Village and seafood markets. Busan sits on the coast, so sea wind can make it feel colder than Seoul in winter." },
    ja: { name: "釜山", region: "韓国・釜山広域市", about: "海雲台や甘川文化村、チャガルチ市場など見どころが海沿いに多く、冬は海風で体感温度が下がります。" },
    zh: { name: "釜山", region: "韓國・釜山廣域市", about: "海雲台、甘川文化村、札嘎其市場等景點多在海邊，冬天海風一吹體感溫度會比首爾還低。" },
  },
  jeju: {
    en: { name: "Jeju", region: "Jeju-si, Jeju Island", about: "Jeju's weather changes fast and the north and south of the island can differ. Check wind before planning a coastal drive or a ferry to Udo." },
    ja: { name: "済州島（チェジュ）", region: "韓国・済州島 済州市", about: "済州島は天気が変わりやすく、島の北と南で天気が違うことも。海沿いのドライブや牛島行きの船の前には風を確認しましょう。" },
    zh: { name: "濟州島", region: "韓國・濟州島 濟州市", about: "濟州島天氣變化快，島的南北兩邊天氣也可能不同。環島兜風或搭船去牛島前，先確認風況。" },
  },
  incheon: {
    en: { name: "Incheon", region: "Incheon, South Korea", about: "Home of Incheon Airport, Chinatown and Songdo. Useful for checking fog and wind on arrival and departure days." },
    ja: { name: "仁川", region: "韓国・仁川広域市", about: "仁川空港やチャイナタウン、松島がある街。到着日・出発日の霧や風の確認に。" },
    zh: { name: "仁川", region: "韓國・仁川廣域市", about: "仁川機場、中華街和松島所在的城市。抵達日、離境日可以用來確認霧和風。" },
  },
  gyeongju: {
    en: { name: "Gyeongju", region: "Gyeongju, North Gyeongsang", about: "The old Silla capital, with Bulguksa Temple and Daereungwon. Spring cherry blossoms and autumn leaves are the busiest times." },
    ja: { name: "慶州", region: "韓国・慶尚北道 慶州市", about: "仏国寺や大陵苑がある新羅の古都。春の桜と秋の紅葉の時期が特に人気です。" },
    zh: { name: "慶州", region: "韓國・慶尚北道 慶州市", about: "新羅古都，有佛國寺和大陵苑。春天櫻花和秋天楓葉時最熱鬧。" },
  },
  gangneung: {
    en: { name: "Gangneung", region: "Gangneung, Gangwon", about: "East coast beaches, coffee street and sunrise spots. The east coast can be sunny while Seoul is cloudy, and the other way round." },
    ja: { name: "江陵", region: "韓国・江原特別自治道 江陵市", about: "東海岸の海辺やカフェ通り、日の出スポットで人気。ソウルと東海岸で天気が逆になることもあります。" },
    zh: { name: "江陵", region: "韓國・江原特別自治道 江陵市", about: "東海岸海灘、咖啡街和看日出的景點。首爾陰天時東海岸可能是晴天，反過來也常見。" },
  },
  sokcho: {
    en: { name: "Sokcho", region: "Sokcho, Gangwon", about: "Gateway to Seoraksan, with a beach and a busy seafood market. Wind off the sea is strong in winter and spring." },
    ja: { name: "束草", region: "韓国・江原特別自治道 束草市", about: "雪嶽山の玄関口で、ビーチと海鮮市場が人気。冬から春は海からの風が強めです。" },
    zh: { name: "束草", region: "韓國・江原特別自治道 束草市", about: "雪嶽山的門戶，有海灘和熱鬧的海鮮市場。冬春兩季海風很強。" },
  },
  jeonju: {
    en: { name: "Jeonju", region: "Jeonju, North Jeolla", about: "Famous for bibimbap and its hanok village. Inland Jeonju gets hot summers and cold winter mornings." },
    ja: { name: "全州", region: "韓国・全北特別自治道 全州市", about: "ビビンバと韓屋村で有名な街。内陸なので夏は暑く、冬の朝は冷え込みます。" },
    zh: { name: "全州", region: "韓國・全北特別自治道 全州市", about: "以拌飯和韓屋村聞名。內陸的全州夏天很熱，冬天早上很冷。" },
  },
  daegu: {
    en: { name: "Daegu", region: "Daegu, South Korea", about: "One of Korea's hottest cities in summer, with Seomun Market and Palgongsan nearby." },
    ja: { name: "大邱", region: "韓国・大邱広域市", about: "夏は韓国でも特に暑くなる街。西門市場や八公山が近くにあります。" },
    zh: { name: "大邱", region: "韓國・大邱廣域市", about: "韓國夏天最熱的城市之一，附近有西門市場和八公山。" },
  },
  yeosu: {
    en: { name: "Yeosu", region: "Yeosu, South Jeolla", about: "A south coast port known for night sea views, the cable car and island hopping. Check wind before boat trips." },
    ja: { name: "麗水", region: "韓国・全羅南道 麗水市", about: "夜の海の景色とケーブルカー、島めぐりで知られる南海岸の港町。船に乗る前は風を確認しましょう。" },
    zh: { name: "麗水", region: "韓國・全羅南道 麗水市", about: "以夜海、纜車和跳島聞名的南海岸港口。搭船前先確認風。" },
  },
  "haeundae-beach": {
    en: { name: "Haeundae Beach", region: "Haeundae-gu, Busan", about: "Busan's most famous beach. Swimming season is roughly July to August; outside it, look for clear days for photos and walks." },
    ja: { name: "海雲台ビーチ", region: "韓国・釜山 海雲台区", about: "釜山を代表するビーチ。海水浴は7〜8月ごろ、それ以外の季節は写真や散歩に向く晴れの日をチェック。" },
    zh: { name: "海雲台海水浴場", region: "韓國・釜山 海雲台區", about: "釜山最有名的海灘。游泳季大約是7～8月，其他季節可以挑晴天來拍照散步。" },
  },
  "gwangalli-beach": {
    en: { name: "Gwangalli Beach", region: "Suyeong-gu, Busan", about: "Best known for the lit-up Gwangan Bridge at night. Clear, calm evenings give the best view." },
    ja: { name: "広安里ビーチ", region: "韓国・釜山 水営区", about: "夜にライトアップされる広安大橋で有名。晴れて風の弱い夜がいちばんきれいに見えます。" },
    zh: { name: "廣安里海水浴場", region: "韓國・釜山 水營區", about: "以夜晚點燈的廣安大橋聞名，晴朗無風的晚上景色最美。" },
  },
  "hyeopjae-beach": {
    en: { name: "Hyeopjae Beach", region: "Hallim-eup, Jeju", about: "Emerald water on Jeju's west coast. The colour of the sea is at its best on sunny, low-wind days." },
    ja: { name: "挟才ビーチ", region: "韓国・済州島 翰林邑", about: "済州島西側のエメラルド色の海。晴れて風の弱い日に海の色がいちばん映えます。" },
    zh: { name: "挾才海水浴場", region: "韓國・濟州島 翰林邑", about: "濟州西岸的翡翠色海水。晴天又沒什麼風的日子，海的顏色最漂亮。" },
  },
  seongsanpo: {
    en: { name: "Seongsan Ilchulbong", region: "Seongsan-eup, Seogwipo, Jeju", about: "The sunrise peak and ferry port for Udo Island. Sunrise times and wind for the ferry are on this page." },
    ja: { name: "城山日出峰", region: "韓国・済州島 西帰浦市 城山邑", about: "日の出の名所で、牛島行きの船が出る港町。日の出の時刻と船に関わる風をこのページで確認できます。" },
    zh: { name: "城山日出峰", region: "韓國・濟州島 西歸浦市 城山邑", about: "看日出的名山，也是搭船去牛島的港口。這頁有日出時間和搭船要看的風況。" },
  },
  "jeonju-hanok-village": {
    en: { name: "Jeonju Hanok Village", region: "Jeonju, North Jeolla", about: "Over 700 traditional houses, popular for walking in hanbok. Most of the visit is outdoors on foot." },
    ja: { name: "全州韓屋村", region: "韓国・全北特別自治道 全州市", about: "700軒以上の韓屋が並び、韓服を着て歩く人に人気。ほとんど屋外を歩いて回ります。" },
    zh: { name: "全州韓屋村", region: "韓國・全北特別自治道 全州市", about: "有700多棟傳統韓屋，很多人穿韓服散步拍照，幾乎都在戶外走。" },
  },
  andong: {
    en: { name: "Andong", region: "Andong, North Gyeongsang", about: "Hahoe Folk Village and the mask dance festival in autumn. Mornings in the valley can be foggy." },
    ja: { name: "安東", region: "韓国・慶尚北道 安東市", about: "河回村と秋の仮面舞踊祭で知られる街。谷あいなので朝は霧が出ることもあります。" },
    zh: { name: "安東", region: "韓國・慶尚北道 安東市", about: "河回村和秋天的假面舞節。河谷地區早上常起霧。" },
  },
  suwon: {
    en: { name: "Suwon", region: "Suwon, Gyeonggi", about: "Hwaseong Fortress, a UNESCO site an hour from Seoul. The fortress walk is about 6 km and fully outdoors." },
    ja: { name: "水原", region: "韓国・京畿道 水原市", about: "ソウルから1時間ほどの世界遺産、水原華城の街。城壁一周は約6kmで、すべて屋外です。" },
    zh: { name: "水原", region: "韓國・京畿道 水原市", about: "離首爾一小時的世界遺產水原華城。城牆步道約6公里，全程在戶外。" },
  },
  "seoraksan-daecheongbong": {
    en: { name: "Seoraksan (Daecheongbong Peak)", region: "Seoraksan National Park, Gangwon", about: "Korea's most famous autumn foliage mountain. Temperatures here are for the 1,708 m summit, which is far colder and windier than Sokcho below." },
    ja: { name: "雪嶽山（大青峰）", region: "韓国・江原特別自治道 雪嶽山国立公園", about: "韓国でいちばん有名な紅葉の山。ここの気温は標高1,708mの山頂の値で、ふもとの束草よりずっと寒く風も強いです。" },
    zh: { name: "雪嶽山（大青峰）", region: "韓國・江原特別自治道 雪嶽山國立公園", about: "韓國最有名的賞楓名山。這裡的氣溫是海拔1,708公尺山頂的值，比山下的束草冷得多、風也大得多。" },
  },
  hallasan: {
    en: { name: "Hallasan (Baengnokdam Summit)", region: "Hallasan National Park, Jeju", about: "South Korea's highest peak at 1,947 m. Trails close in heavy snow or rain, and the summit can be below freezing when the coast is mild." },
    ja: { name: "漢拏山（白鹿潭）", region: "韓国・済州島 漢拏山国立公園", about: "標高1,947mの韓国最高峰。大雪や大雨では入山規制があり、海辺が暖かくても山頂は氷点下のことがあります。" },
    zh: { name: "漢拏山（白鹿潭）", region: "韓國・濟州島 漢拏山國立公園", about: "海拔1,947公尺的南韓最高峰。大雪或大雨時步道會封閉，海邊溫和時山頂也可能在零度以下。" },
  },
  "bukhansan-baegundae": {
    en: { name: "Bukhansan (Baegundae Peak)", region: "Bukhansan National Park, Seoul", about: "A granite peak you can reach by subway from central Seoul. Rocks near the top get slippery after rain or frost." },
    ja: { name: "北漢山（白雲台）", region: "韓国・ソウル 北漢山国立公園", about: "ソウル市内から地下鉄で行ける岩山。雨や霜のあとは山頂付近の岩が滑りやすくなります。" },
    zh: { name: "北漢山（白雲臺）", region: "韓國・首爾 北漢山國立公園", about: "從首爾市中心搭地鐵就能到的花崗岩山峰。下雨或結霜後，山頂附近的岩石很滑。" },
  },
  "jirisan-cheonwangbong": {
    en: { name: "Jirisan (Cheonwangbong Peak)", region: "Jirisan National Park, South Gyeongsang", about: "Mainland Korea's highest peak at 1,915 m, usually climbed with an overnight shelter stay. Check summit wind chill before you go." },
    ja: { name: "智異山（天王峰）", region: "韓国・慶尚南道 智異山国立公園", about: "標高1,915mの韓国本土最高峰で、山小屋に泊まって登るのが一般的。出発前に山頂の体感温度を確認しましょう。" },
    zh: { name: "智異山（天王峰）", region: "韓國・慶尚南道 智異山國立公園", about: "海拔1,915公尺的韓國本土最高峰，一般會住山屋登頂。出發前先確認山頂體感溫度。" },
  },
  yongpyong: {
    en: { name: "Yongpyong Resort", region: "Pyeongchang, Gangwon", about: "Korea's largest ski resort and a 2018 Winter Olympics venue. The season usually runs from late November to March." },
    ja: { name: "龍平リゾート", region: "韓国・江原特別自治道 平昌郡", about: "韓国最大級のスキー場で、2018年平昌五輪の会場。シーズンはふつう11月下旬から3月までです。" },
    zh: { name: "龍平度假村", region: "韓國・江原特別自治道 平昌郡", about: "韓國最大的滑雪場之一，也是2018平昌冬奧場地。雪季通常是11月下旬到3月。" },
  },
  "phoenix-pyeongchang": {
    en: { name: "Phoenix Pyeongchang", region: "Pyeongchang, Gangwon", about: "Ski and snowboard resort that hosted Olympic freestyle and snowboard events, about two hours from Seoul." },
    ja: { name: "フェニックス平昌", region: "韓国・江原特別自治道 平昌郡", about: "平昌五輪のフリースタイル・スノーボード会場になったスキー場。ソウルから約2時間です。" },
    zh: { name: "鳳凰平昌", region: "韓國・江原特別自治道 平昌郡", about: "平昌冬奧自由式滑雪和單板項目的場地，離首爾約2小時。" },
  },
  high1: {
    en: { name: "High1 Resort", region: "Jeongseon, Gangwon", about: "A high-altitude ski resort in the Taebaek Mountains, often colder and snowier than resorts nearer Seoul." },
    ja: { name: "ハイワンリゾート", region: "韓国・江原特別自治道 旌善郡", about: "太白山脈の標高の高いスキー場で、ソウル近郊のスキー場より寒く雪も多めです。" },
    zh: { name: "High1度假村", region: "韓國・江原特別自治道 旌善郡", about: "位在太白山脈的高海拔滑雪場，通常比首爾近郊的滑雪場更冷、雪更多。" },
  },
  "nami-island": {
    en: { name: "Nami Island", region: "Chuncheon, Gangwon", about: "The tree-lined island from the drama Winter Sonata, reached by a short ferry from Gapyeong. Best in autumn leaves and snowy winter days; most of the visit is outdoors." },
    ja: { name: "南怡島（ナミソム）", region: "韓国・江原特別自治道 春川市", about: "ドラマ「冬のソナタ」のロケ地で、加平から船ですぐの並木道の島。紅葉と雪景色の季節が人気で、ほとんど屋外を歩きます。" },
    zh: { name: "南怡島", region: "韓國・江原特別自治道 春川市", about: "韓劇《冬季戀歌》拍攝地，從加平搭船很快就到的林蔭大道小島。秋天楓葉和冬天雪景最受歡迎，幾乎全程都在戶外。" },
  },
  udo: {
    en: { name: "Udo Island", region: "Udo-myeon, Jeju-si, Jeju", about: "A small island off Jeju's east coast, 15 minutes by ferry from Seongsan. Ferries stop in strong wind or high waves, so check before you go." },
    ja: { name: "牛島（ウド）", region: "韓国・済州島 済州市 牛島面", about: "済州島の東、城山港から船で15分の小さな島。風や波が強いと船が止まるので、出発前に確認を。" },
    zh: { name: "牛島", region: "韓國・濟州島 濟州市 牛島面", about: "濟州島東邊的小島，從城山港搭船約15分鐘。風浪大時船班會停駛，出發前記得確認。" },
  },
  everland: {
    en: { name: "Everland", region: "Yongin, Gyeonggi", about: "Korea's largest theme park, about an hour from Seoul. Rides like T Express stop in strong wind or lightning, and summer afternoons bring showers." },
    ja: { name: "エバーランド", region: "韓国・京畿道 龍仁市", about: "ソウルから約1時間、韓国最大のテーマパーク。強風や雷でT-EXPRESSなどの乗り物が止まることがあり、夏の午後はにわか雨も。" },
    zh: { name: "愛寶樂園", region: "韓國・京畿道 龍仁市", about: "離首爾約1小時的韓國最大主題樂園。強風或打雷時T-Express等遊樂設施會暫停，夏天下午也常有陣雨。" },
  },
  imjingak: {
    en: { name: "Imjingak (DMZ)", region: "Paju, Gyeonggi", about: "The usual starting point for DMZ tours, near the border north of Seoul. Tours can be cancelled in bad weather, and winter wind here is bitter." },
    ja: { name: "臨津閣（DMZ）", region: "韓国・京畿道 坡州市", about: "ソウルの北、軍事境界線近くにあるDMZツアーの出発地。悪天候でツアーが中止になることがあり、冬の風は厳しいです。" },
    zh: { name: "臨津閣（DMZ）", region: "韓國・京畿道 坡州市", about: "首爾北邊、靠近軍事分界線的DMZ行程出發點。天候不佳時行程可能取消，冬天的風非常刺骨。" },
  },
  aewol: {
    en: { name: "Aewol", region: "Aewol-eup, Jeju-si, Jeju", about: "Jeju's west-coast café road and sunset spot, close to the airport. Coastal walks and ocean-view cafés are best on calm, clear evenings." },
    ja: { name: "涯月（エウォル）", region: "韓国・済州島 済州市 涯月邑", about: "空港から近い済州島西海岸のカフェ通りと夕日スポット。海沿いの散歩やオーシャンビューカフェは、風の弱い晴れた夕方がいちばん。" },
    zh: { name: "涯月", region: "韓國・濟州島 濟州市 涯月邑", about: "離機場很近的濟州西海岸咖啡街和看夕陽的地方。海邊散步和海景咖啡廳，選無風的晴朗傍晚最棒。" },
  },
  danyang: {
    en: { name: "Danyang", region: "Danyang, North Chungcheong", about: "Inland river town known for paragliding, the Mancheonha Skywalk and limestone caves. Paragliding depends on wind, and valley mornings are often foggy." },
    ja: { name: "丹陽（タニャン）", region: "韓国・忠清北道 丹陽郡", about: "パラグライダーや万天下スカイウォーク、鍾乳洞で知られる川沿いの町。パラグライダーは風しだいで、谷の朝は霧が出やすいです。" },
    zh: { name: "丹陽", region: "韓國・忠清北道 丹陽郡", about: "以滑翔傘、萬天下天空步道和鐘乳石洞聞名的河畔小鎮。滑翔傘要看風，河谷早上常起霧。" },
  },
  "boseong-green-tea": {
    en: { name: "Boseong Green Tea Fields", region: "Boseong, South Jeolla", about: "Korea's best-known terraced tea plantation (Daehan Dawon). The rows look greenest from spring to early summer, and slopes get slippery after rain." },
    ja: { name: "宝城緑茶畑", region: "韓国・全羅南道 宝城郡", about: "韓国でいちばん有名な段々の茶畑（大韓茶園）。春から初夏がいちばん緑が濃く、雨のあとは坂道が滑りやすいです。" },
    zh: { name: "寶城綠茶園", region: "韓國・全羅南道 寶城郡", about: "韓國最有名的梯田茶園（大韓茶園）。春天到初夏最翠綠，下雨後斜坡容易滑。" },
  },
  "damyang-juknokwon": {
    en: { name: "Damyang Juknokwon Bamboo Forest", region: "Damyang, South Jeolla", about: "A bamboo forest with walking paths, near Gwangju. Shady and cooler than the city on hot days, and atmospheric in light rain." },
    ja: { name: "潭陽 竹緑苑", region: "韓国・全羅南道 潭陽郡", about: "光州近くの竹林の散策路。暑い日は日陰で街より涼しく、小雨の日も雰囲気があります。" },
    zh: { name: "潭陽竹綠苑", region: "韓國・全羅南道 潭陽郡", about: "光州附近的竹林步道。大熱天有樹蔭比市區涼，下小雨時也很有氣氛。" },
  },
  "yangyang-jukdo-beach": {
    en: { name: "Yangyang Jukdo Beach", region: "Yangyang, Gangwon", about: "The center of Korea's surf scene on the east coast. Wave height and wind on this page help you pick a surf day; summer is busiest." },
    ja: { name: "襄陽 竹島ビーチ", region: "韓国・江原特別自治道 襄陽郡", about: "東海岸にある韓国サーフィンの中心地。このページの波の高さと風でサーフィン日和を選べます。夏がいちばんにぎわいます。" },
    zh: { name: "襄陽竹島海灘", region: "韓國・江原特別自治道 襄陽郡", about: "東海岸的韓國衝浪聖地。可以用這頁的浪高和風挑衝浪日，夏天最熱鬧。" },
  },
  chuncheon: {
    en: { name: "Chuncheon", region: "Chuncheon, Gangwon", about: "Lakeside city of dakgalbi, Soyang River Skywalk and the gateway to Nami Island. Inland Chuncheon is colder than Seoul on winter mornings." },
    ja: { name: "春川（チュンチョン）", region: "韓国・江原特別自治道 春川市", about: "タッカルビと昭陽江スカイウォークの湖の街で、南怡島への玄関口。内陸なので冬の朝はソウルより冷えます。" },
    zh: { name: "春川", region: "韓國・江原特別自治道 春川市", about: "辣炒雞排和昭陽江天空步道的湖畔城市，也是去南怡島的門戶。內陸的春川冬天早上比首爾還冷。" },
  },
  suncheon: {
    en: { name: "Suncheon", region: "Suncheon, South Jeolla", about: "Suncheon Bay wetland reeds and the national garden. The reeds turn gold in autumn, and the bay is best at sunset on clear days." },
    ja: { name: "順天（スンチョン）", region: "韓国・全羅南道 順天市", about: "順天湾の湿地の葦原と国家庭園。秋は葦が金色になり、晴れた日の夕暮れがいちばんきれいです。" },
    zh: { name: "順天", region: "韓國・全羅南道 順天市", about: "順天灣濕地的蘆葦和國家庭園。秋天蘆葦變成金黃色，晴天的夕陽最美。" },
  },
  tongyeong: {
    en: { name: "Tongyeong", region: "Tongyeong, South Gyeongsang", about: "A harbor town of islands, the Hallyeosu cable car and seafood. Island ferries depend on wind and waves." },
    ja: { name: "統営（トンヨン）", region: "韓国・慶尚南道 統営市", about: "島々とケーブルカー、海鮮の港町。島へ行く船は風と波しだいです。" },
    zh: { name: "統營", region: "韓國・慶尚南道 統營市", about: "有許多小島、閑麗水道纜車和海鮮的港口城市。去離島的船班要看風浪。" },
  },
  geojedo: {
    en: { name: "Geoje Island", region: "Geoje, South Gyeongsang", about: "Korea's second-largest island, with coastal drives and boat trips to Oedo Botania. Boats don't run in high waves." },
    ja: { name: "巨済島（コジェド）", region: "韓国・慶尚南道 巨済市", about: "韓国で2番目に大きい島。海沿いのドライブや外島ボタニアへの船が人気で、波が高いと船は出ません。" },
    zh: { name: "巨濟島", region: "韓國・慶尚南道 巨濟市", about: "韓國第二大島，海岸兜風和搭船去外島植物園很受歡迎。浪大時船不開。" },
  },
  "hamdeok-beach": {
    en: { name: "Hamdeok Beach", region: "Jocheon-eup, Jeju-si, Jeju", about: "Turquoise shallow water near Jeju Airport, with Seoubong hill beside it. The sea looks best on sunny, calm days." },
    ja: { name: "咸徳ビーチ", region: "韓国・済州島 済州市 朝天邑", about: "済州空港から近い、遠浅のエメラルドの海。晴れて風の弱い日がいちばんきれいです。" },
    zh: { name: "咸德海水浴場", region: "韓國・濟州島 濟州市 朝天邑", about: "離濟州機場很近的淺灘碧綠海水，旁邊就是犀牛峰。晴天無風時海最漂亮。" },
  },
  "jungmun-beach": {
    en: { name: "Jungmun Saekdal Beach", region: "Seogwipo, Jeju", about: "A resort beach on Jeju's south coast with surf-friendly waves. The south side is often milder than Jeju City in winter." },
    ja: { name: "中文 穡達ビーチ", region: "韓国・済州島 西帰浦市", about: "済州島南岸のリゾートビーチで、サーフィンができる波も。冬は済州市より暖かいことが多いです。" },
    zh: { name: "中文穡達海水浴場", region: "韓國・濟州島 西歸浦市", about: "濟州南岸的度假海灘，浪也適合衝浪。冬天常比濟州市溫暖。" },
  },
};

export function placeText(slug: string, l: ForeignLocale): PlaceText | undefined {
  return PLACE_TEXT[slug]?.[l];
}

/** 그 장소에 외국어 페이지가 있는지 */
export function hasForeignPage(slug: string): boolean {
  return slug in PLACE_TEXT;
}
