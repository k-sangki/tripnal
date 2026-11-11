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
import { FLAG_OF, flagDataUrl } from "@/components/Flag";
import { SLOGAN, SLOGAN_FOREIGN } from "@/lib/brand";
import { placeText } from "@/data/places-i18n";
import { isForeignLocale, type Locale } from "@/lib/i18n";
import { shortName } from "@/lib/seo-foreign";
import { dayVerdict, pickVerdictDate, signalWindow, stripEmoji, verdictDay, verdictShareTitle, type VerdictLevel } from "@/lib/verdict";

/**
 * 카카오톡·네이버 등에 링크를 붙였을 때 보이는 미리보기 이미지 (1200×630).
 * 장소·기간의 날짜별 날씨를 요약해 그린다. 주소: /api/og?lat&lon&name&from&to&act 또는 /api/og?slug&from&to&act
 * lang=en|ja|zh 를 붙이면 영어·일본어·중국어 그림 (영어는 바람 km/h)
 * 국내 한국어 그림은 "가도 될까?" 판정 그림: vd=YYYY-MM-DD 가 있으면 그날, 없으면 기간 안의 다가오는 토요일.
 * 판정 아래에 예측 가능성과 7일 신호등 한 줄을 같이 그린다. 해외·외국어 그림은 날짜별 날씨 칸 그대로.
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
/** 출처 글의 ECMWF·GFS·ICON 앞에 국기 그림 (satori는 글과 그림을 섞으려면 flex 줄이어야 한다) */
function OgSource({ text }: { text: string }) {
  const parts = text.split(/(ECMWF|GFS|ICON)/).filter(Boolean);
  return (
    <span style={{ display: "flex", alignItems: "center" }}>
      {parts.map((p, i) =>
        FLAG_OF[p] ? (
          <span key={i} style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={flagDataUrl(FLAG_OF[p])} width={30} height={20} style={{ marginRight: 6, borderRadius: 3 }} />
            {p}
          </span>
        ) : (
          <span key={i}>{p.replace(/^ | $/g, "\u00a0")}</span>
        ),
      )}
    </span>
  );
}

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
  let verdict: { day: DayForecast; row: DayForecast[]; issued: string } | undefined;
  if (Number.isFinite(lat) && Number.isFinite(lon) && (dest || isInKorea(lat, lon))) {
    try {
      const f = await getForecast(lat, lon, slugPlace?.elevation ?? dest?.elevation, undefined, offset);
      days = f.days.filter((d) => inPeriod(d.date, period)).slice(0, MAX_COLS);
      if (l === "ko" && !dest) {
        const ahead = f.days.filter((d) => d.date >= today);
        const dates = ahead.map((d) => d.date);
        const picked = pickVerdictDate(dates, sp.get("vd"), (d) => inPeriod(d, period));
        const day = ahead.find((d) => d.date === picked);
        if (day) {
          const row = signalWindow(dates, day.date);
          verdict = { day, row: ahead.filter((d) => row.includes(d.date)), issued: issuedLabel(f.generatedAt) };
        }
      }
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

  if (verdict) return verdictImage(verdict.day, verdict.row, verdict.issued, name, leisure.id, leisure.label, leisure.group);

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
        <OgSource text={TEXT[l].source} />
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

const STAMP: Record<VerdictLevel, { bg: string; fg: string; dot: string }> = {
  go: { bg: "#e3f9f0", fg: "#0b6b4c", dot: "#12b886" },
  meh: { bg: "#fff4dd", fg: "#8a5a00", dot: "#fab005" },
  stop: { bg: "#ffece7", fg: "#b8361a", dot: "#fa5252" },
};

/** 언제 만든 예보인지 ("11/10 오전 예보"). 카카오톡이 그림을 한동안 저장해 두므로 그림에 적어 둔다 */
function issuedLabel(generatedAt: string | undefined): string {
  const t = generatedAt ? new Date(generatedAt) : new Date();
  const at = Number.isNaN(t.getTime()) ? new Date() : t;
  const d = kstDate(at);
  const hour = new Date(at.getTime() + 9 * 3600_000).getUTCHours();
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))} ${hour < 12 ? "오전" : "오후"} 예보`;
}

/** 예측 가능성에 붙이는 말 (예보표와 같은 80·60 문턱) */
function predictText(p: number): { text: string; bg: string; fg: string } {
  if (p >= 80) return { text: "거의 굳은 예보예요", bg: "#e3f9f0", fg: "#0b6b4c" };
  if (p >= 60) return { text: "조금 바뀔 수 있어요", bg: "#fff4dd", fg: "#8a5a00" };
  return { text: "아직 뒤집힐 수 있어요", bg: "#fff0f0", fg: "#c92a2a" };
}

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** 판정 그림: 장소·날짜 제목, 날씨 아이콘, 한 줄 판정, 근거 숫자, 예측 가능성, 7일 신호등 */
async function verdictImage(
  d: DayForecast,
  row: DayForecast[],
  issued: string,
  name: string,
  act: Parameters<typeof dayVerdict>[1],
  label: string,
  group: Parameters<typeof dayVerdict>[2],
) {
  const v = dayVerdict(verdictDay(d), act, group);
  const title = verdictShareTitle(name, label, d.date)!;
  const verdict = stripEmoji(v.title);
  const chips = v.chips.map((c) => ({ text: stripEmoji(c.text), bad: c.bad }));
  const icon = ICONS[codeIcon(d.code).replace("️", "")] ?? ICONS["☁"];
  const c = STAMP[v.level];
  const pd = d.predictability == null ? null : { p: d.predictability, ...predictText(d.predictability) };
  const family = "Noto Sans KR";
  const element = (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#fff", fontFamily: family }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: DARK, color: "#fff", padding: "26px 48px 22px" }}>
        <div style={{ fontSize: title.length > 24 ? 40 : title.length > 20 ? 44 : 50, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 26, opacity: 0.85, marginLeft: 20, whiteSpace: "nowrap" }}>{issued}</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 48px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} width={160} height={160} alt="" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", marginLeft: 40 }}>
          <div style={{ display: "flex", background: c.bg, color: c.fg, borderRadius: 26, padding: "14px 28px", fontSize: verdict.length > 14 ? 46 : 56, fontWeight: 700, lineHeight: 1.2 }}>
            {verdict}
          </div>
          <div style={{ fontSize: 28, color: c.fg, marginTop: 8, marginLeft: 6 }}>{v.sub}</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 12 }}>
            {chips.map((x) => (
              <div
                key={x.text}
                style={{ display: "flex", fontSize: 25, fontWeight: 700, padding: "6px 16px", borderRadius: 999, marginRight: 10, marginBottom: 6, background: x.bad ? "#ffece7" : "#f2f4f6", color: x.bad ? "#b8361a" : "#4e5968" }}
              >
                {x.text}
              </div>
            ))}
          </div>
          {pd && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 6, fontSize: 26, fontWeight: 700, color: "#4e5968" }}>
              <span>예측 가능성</span>
              <span style={{ background: pd.bg, color: pd.fg, padding: "2px 12px", borderRadius: 10, margin: "0 12px" }}>{pd.p}%</span>
              <span>{pd.text}</span>
            </div>
          )}
        </div>
      </div>
      {row.length > 1 && (
        <div style={{ display: "flex", padding: "0 43px 12px" }}>
          {row.map((x) => {
            const w = weekday(x.date);
            const on = x.date === d.date;
            const dot = STAMP[dayVerdict(verdictDay(x), act, group).level].dot;
            return (
              <div
                key={x.date}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  margin: "0 5px",
                  padding: "6px 0 9px",
                  borderRadius: 16,
                  background: on ? "#fff" : "#f6f7f8",
                  border: `4px solid ${on ? DARK : "#f6f7f8"}`,
                  fontSize: 23,
                  fontWeight: 700,
                  color: "#333",
                }}
              >
                <div style={{ display: "flex" }}>{md(x.date)}</div>
                <div style={{ display: "flex", color: w === 0 ? "#d6336c" : w === 6 ? BLUE : "#333" }}>{weekdayKo(x.date)}</div>
                <div style={{ display: "flex", width: 28, height: 28, borderRadius: 14, background: dot, marginTop: 4 }} />
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #e5e8eb", padding: "12px 48px 16px", fontSize: 24, color: "#556" }}>
        <OgSource text={TEXT.ko.source} />
        <span style={{ fontWeight: 700, color: DARK }}>{SLOGAN} · tripnalc.com</span>
      </div>
    </div>
  );
  const glyphs = [title, verdict, v.sub, ...chips.map((x) => x.text), issued, "오전오후예보", "예측 가능성", pd?.text ?? "", "일월화수목금토", TEXT.ko.source, SLOGAN, "tripnalc.com", "0123456789/°-%.,()ms·"].join("");
  try {
    const [regular, bold] = await Promise.all([loadFont(glyphs, 400, family), loadFont(glyphs, 700, family)]);
    return new ImageResponse(element, {
      width: W,
      height: H,
      fonts: [
        { name: family, data: regular, weight: 400, style: "normal" },
        { name: family, data: bold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" },
    });
  } catch (e) {
    console.error(e);
    return new Response("미리보기 이미지를 만들지 못했습니다.", { status: 500 });
  }
}
