import { ImageResponse } from "next/og";
import { getLeisure } from "@/lib/leisure";
import { clampPeriod, inPeriod, periodLabel } from "@/lib/period";
import { destinationOffset, getDestination } from "@/lib/overseas";
import { getPlace } from "@/lib/places";
import { addDays, kstDate, weekday, weekdayKo, weekdayName } from "@/lib/time";
import { getForecast, isInKorea } from "@/lib/weather";
import { codeIcon } from "@/lib/weather/codes";
import type { DayForecast } from "@/lib/weather/types";
import { ICONS } from "./icons";
import { SLOGAN, SLOGAN_FOREIGN } from "@/lib/brand";
import { placeText } from "@/data/places-i18n";
import { isForeignLocale, type Locale } from "@/lib/i18n";
import { shortName } from "@/lib/seo-foreign";

/**
 * 카카오톡·네이버 등에 링크를 붙였을 때 보이는 미리보기 이미지 (1200×630).
 * 장소·기간의 날짜별 날씨를 요약해 그린다. 주소: /api/og?lat&lon&name&from&to&act 또는 /api/og?slug&from&to&act
 * lang=en|ja|zh 를 붙이면 영어·일본어·중국어 그림 (영어는 바람 km/h)
 */

const W = 1200;
const H = 630;
/** 한 장에 넣을 최대 날짜 수 */
const MAX_COLS = 7;

/** 구글 폰트에서 이 글자들만 담긴 ttf를 받는다 (한글 전체 폰트는 수 MB라서 그때그때 필요한 글자만) */
async function loadFont(text: string, weight: number, family: string): Promise<ArrayBuffer> {
  const q = new URLSearchParams({ family: `${family}:wght@${weight}`, text });
  const css = await (await fetch(`https://fonts.googleapis.com/css2?${q}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("폰트 주소를 찾지 못했습니다.");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`폰트 ${res.status}`);
  return res.arrayBuffer();
}

const BLUE = "#1c6dd0";

/** 그림 속 고정 문구 */
const TEXT: Record<Locale, { empty: string; source: string; wind: (v: number) => string }> = {
  ko: { empty: "캠핑·낚시·등산 16일 날씨, 3시간 간격으로", source: "ECMWF·GFS·ICON 예보 종합", wind: (v) => `바람 ${Math.round(v)}m/s` },
  en: { empty: "Korea weather, 16 days ahead, every 3 hours", source: "Blend of ECMWF·GFS·ICON", wind: (v) => `Wind ${Math.round(v * 3.6)}km/h` },
  ja: { empty: "韓国の天気、2週間先まで3時間ごと", source: "ECMWF・GFS・ICONの予報を総合", wind: (v) => `風 ${Math.round(v)}m/s` },
  zh: { empty: "韓國天氣，最長16天、每3小時", source: "綜合ECMWF・GFS・ICON預報", wind: (v) => `風 ${Math.round(v)}m/s` },
};
const DARK = "#0E3B36";

function DayCol({ d, narrow, l }: { d: DayForecast; narrow: boolean; l: Locale }) {
  const w = weekday(d.date);
  const color = w === 0 ? "#d6336c" : w === 6 ? BLUE : "#222";
  const icon = ICONS[codeIcon(d.code).replace("\uFE0F", "")] ?? ICONS["☁"];
  const size = narrow ? 64 : 76;
  const rain = d.precipSum >= 0.5 ? `${Math.round(d.precipSum)}mm` : "-";
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#fff",
        borderRadius: 24,
        padding: "22px 8px",
        margin: "0 6px",
      }}
    >
      <div style={{ fontSize: narrow ? 26 : 30, fontWeight: 700, color }}>{d.date.slice(5).replace("-", "/").replace(/(^|\/)0/g, "$1")}</div>
      <div style={{ fontSize: 24, color }}>{l === "ko" ? `${weekdayKo(d.date)}요일` : l === "zh" ? `週${weekdayName(d.date, l)}` : weekdayName(d.date, l)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} width={size} height={size} style={{ margin: "14px 0 10px" }} alt="" />
      <div style={{ display: "flex", fontSize: narrow ? 32 : 38, fontWeight: 700 }}>
        <span style={{ color: "#e03131" }}>{d.tMax == null ? "-" : `${Math.round(d.tMax)}°`}</span>
        <span style={{ color: "#999" }}>/</span>
        <span style={{ color: BLUE }}>{d.tMin == null ? "-" : `${Math.round(d.tMin)}°`}</span>
      </div>
      <div style={{ fontSize: narrow ? 22 : 26, color: BLUE, marginTop: 12, whiteSpace: "nowrap" }}>
        {d.precipProbMax != null && d.precipSum >= 0.5 ? `${rain} ${d.precipProbMax}%` : rain}
      </div>
      <div style={{ fontSize: narrow ? 22 : 26, color: "#555", marginTop: 6, whiteSpace: "nowrap" }}>{d.windMax == null ? "-" : TEXT[l].wind(d.windMax)}</div>
    </div>
  );
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const langParam = sp.get("lang") ?? "";
  const l: Locale = isForeignLocale(langParam) ? langParam : "ko";
  const slugPlace = sp.get("slug") ? getPlace(sp.get("slug")!) : undefined;
  // 해외 여행지는 현지 날짜로
  const dest = sp.get("slug") && !slugPlace ? getDestination(sp.get("slug")!) : undefined;
  const offset = dest ? destinationOffset(dest) : undefined;
  const today = kstDate(new Date(), offset);
  const lat = slugPlace?.lat ?? dest?.lat ?? Number(sp.get("lat"));
  const lon = slugPlace?.lon ?? dest?.lon ?? Number(sp.get("lon"));
  const name = (slugPlace?.name ?? dest?.name ?? sp.get("name") ?? "").slice(0, 20) || "선택한 위치";
  const leisure = getLeisure(sp.get("act") ?? slugPlace?.leisure ?? (dest ? "travel" : undefined));
  // 기간 없이 공유한 장소 페이지는 앞으로 7일을 보여 준다
  const period = sp.get("from") ? clampPeriod(sp.get("from"), sp.get("to"), today) : { from: today, to: addDays(today, MAX_COLS - 1) };

  let days: DayForecast[] = [];
  if (Number.isFinite(lat) && Number.isFinite(lon) && (dest || isInKorea(lat, lon))) {
    try {
      const f = await getForecast(lat, lon, slugPlace?.elevation ?? dest?.elevation, undefined, offset);
      days = f.days.filter((d) => inPeriod(d.date, period)).slice(0, MAX_COLS);
    } catch (e) {
      console.error(e);
    }
  }
  const foreignName = l !== "ko" && slugPlace ? placeText(slugPlace.slug, l)?.name : undefined;
  const title =
    l === "en"
      ? `${foreignName ? shortName(foreignName) : name} weather`
      : l === "ja"
        ? `${foreignName ? shortName(foreignName) : name}の天気`
        : l === "zh"
          ? `${foreignName ? shortName(foreignName) : name}天氣`
          : `${name} ${leisure.label} 날씨`;
  const sub = periodLabel(period, l);
  const slogan = l === "ko" ? SLOGAN : SLOGAN_FOREIGN[l];
  const family = l === "ja" ? "Noto Sans JP" : l === "zh" ? "Noto Sans TC" : "Noto Sans KR";
  const narrow = days.length > 5;

  const element = (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#eef2f1", fontFamily: family }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: DARK, color: "#fff", padding: "34px 48px 30px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 54, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 30, opacity: 0.85, marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.9 }}>{slogan}</div>
      </div>
      <div style={{ flex: 1, display: "flex", padding: "26px 36px 0" }}>
        {days.length ? (
          days.map((d) => <DayCol key={d.date} d={d} narrow={narrow} l={l} />)
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: "#333" }}>
            {TEXT[l].empty}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 48px 24px", fontSize: 26, color: "#556" }}>
        <span>{TEXT[l].source}</span>
        <span style={{ fontWeight: 700, color: DARK }}>tripnalc.com</span>
      </div>
    </div>
  );

  // 그림에 들어가는 글자만 담아 폰트를 받는다 (숫자·기호는 미리 넣어 둔다)
  const t = TEXT[l];
  const weekdays = l === "ko" ? "일월화수목금토요" : l === "ja" ? "日月火水木金土" : l === "zh" ? "週日一二三四五六" : "SunMonTueWedThuFriSat";
  const glyphs = [title, sub, slogan, t.empty, t.source, t.wind(10), "tripnalc.com", "0123456789/°-%mms", weekdays].join("");
  try {
    const [regular, bold] = await Promise.all([loadFont(glyphs, 400, family), loadFont(glyphs, 700, family)]);
    return new ImageResponse(element, {
      width: W,
      height: H,
      fonts: [
        { name: family, data: regular, weight: 400, style: "normal" },
        { name: family, data: bold, weight: 700, style: "normal" },
      ],
      // 카카오톡은 이미지를 따로 오래 저장하므로 여기서는 30분만 둔다
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" },
    });
  } catch (e) {
    console.error(e);
    return new Response("미리보기 이미지를 만들지 못했습니다.", { status: 500 });
  }
}
