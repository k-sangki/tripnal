import type { GroupId, LeisureId } from "@/lib/leisure";
import { codeIcon, codeInfo } from "@/lib/weather/codes";
import type { DayForecast } from "@/lib/weather/types";
import { weekdayKo } from "@/lib/time";

/**
 * "가도 될까?" 하루 판정 (장소 페이지 판정 카드·공유 그림).
 * 점수 대신 비·돌풍·파고·기온 문턱으로 정한다. 왜 그렇게 나왔는지 근거 숫자(chips)를 늘 같이 보여준다.
 */
export type VerdictLevel = "go" | "meh" | "stop";
export type Cause = "rain" | "wind" | "wave" | "cold" | "heat" | "none";
type Kind = "camp" | "hike" | "fish" | "sea" | "ride" | "golf" | "ski" | "air" | "trip";

export interface VerdictChip {
  text: string;
  bad: boolean;
}

export interface Verdict {
  level: VerdictLevel;
  /** 판정을 가른 원인 (좋은 날은 none) */
  cause: Cause;
  emoji: string;
  title: string;
  sub: string;
  chips: VerdictChip[];
}

/** 판정에 쓰는 하루 요약 */
export interface VerdictDay {
  code: number | null;
  rain: number;
  prob: number | null;
  gust: number | null;
  tMin: number | null;
  tMax: number | null;
  wave: number | null;
}

export function verdictDay(d: DayForecast): VerdictDay {
  const waves = d.slots.map((s) => s.wave).filter((x): x is number => x != null);
  return {
    code: d.code,
    rain: Math.round(d.precipSum * 10) / 10,
    prob: d.precipProbMax,
    gust: d.gustMax,
    tMin: d.tMin,
    tMax: d.tMax,
    wave: waves.length ? Math.max(...waves) : null,
  };
}

function kindOf(id: LeisureId, group: GroupId): Kind {
  if (id === "camping") return "camp";
  if (id === "hiking" || id === "climbing") return "hike";
  if (id === "fishing") return "fish";
  if (id === "golf" || id === "tennis") return "golf";
  if (id === "cycling" || id === "running") return "ride";
  if (group === "marine") return "sea";
  if (group === "snow") return "ski";
  if (group === "air") return "air";
  return "trip";
}

/** 바람에 민감한 활동은 문턱이 낮다 (m/s, 돌풍) */
const WIND: Record<Kind, [meh: number, stop: number]> = {
  camp: [11, 16],
  hike: [12, 17],
  fish: [9, 13],
  sea: [9, 13],
  ride: [9, 13],
  golf: [10, 15],
  ski: [12, 17],
  air: [7, 10],
  trip: [12, 17],
};

function judge(v: VerdictDay, kind: Kind): { level: VerdictLevel; cause: Cause } {
  const gust = v.gust ?? 0;
  const [windMeh, windStop] = WIND[kind];
  const sea = kind === "fish" || kind === "sea";
  const snowDay = v.code != null && v.code >= 71 && v.code <= 86;

  // 스키는 눈이 와도 괜찮고, 영하도 괜찮다
  const skiSnow = kind === "ski" && snowDay;
  const rainy = skiSnow ? 0 : v.rain;
  const prob = skiSnow ? 0 : (v.prob ?? 0);
  if (rainy >= 10 || (rainy >= 3 && prob >= 80)) return { level: "stop", cause: "rain" };
  if (gust >= windStop) return { level: "stop", cause: "wind" };
  if (sea && (v.wave ?? 0) >= 2) return { level: "stop", cause: "wave" };
  if ((v.tMax ?? 0) >= 35) return { level: "stop", cause: "heat" };
  if (kind !== "ski" && (v.tMax ?? 99) <= -5) return { level: "stop", cause: "cold" };
  if (kind === "camp" && (v.tMin ?? 99) <= -10) return { level: "stop", cause: "cold" };

  if (rainy >= 1 || prob >= 60) return { level: "meh", cause: "rain" };
  if (gust >= windMeh) return { level: "meh", cause: "wind" };
  if (sea && (v.wave ?? 0) >= 1.2) return { level: "meh", cause: "wave" };
  if ((v.tMax ?? 0) >= 31) return { level: "meh", cause: "heat" };
  if (kind === "ski" && (v.tMax ?? 0) >= 8) return { level: "meh", cause: "heat" };
  if (kind === "camp" ? (v.tMin ?? 99) < -3 : kind !== "ski" && (v.tMax ?? 99) < 5) return { level: "meh", cause: "cold" };
  return { level: "go", cause: "none" };
}

const GO: Record<Kind, string> = {
  camp: "텐트 쳐도 됨, 불멍 각 🔥",
  hike: "정상 인증샷 각 📸",
  fish: "바람 잔잔, 출조 각 🎣",
  sea: "바다 나가기 좋은 날 🌊",
  ride: "라이딩 각, 바람도 순함",
  golf: "OB 나면 실력 탓 ⛳",
  ski: "슬로프 열일 각 🏂",
  air: "하늘 날기 좋은 날",
  trip: "놀러 가기 딱 좋은 날 ☀️",
};

const STOP: Record<Kind, string> = {
  camp: "이번엔 집캠 추천 🏠",
  hike: "산은 다음 주에도 그 자리에 있어요",
  fish: "배 멀미 각오, 이번엔 쉬어요",
  sea: "바다는 오늘 쉬는 날",
  ride: "오늘은 실내 자전거 날",
  golf: "라운딩보다 스크린 각",
  ski: "오늘은 슬로프보다 온천",
  air: "오늘은 비행 금지 각",
  trip: "실내 코스로 짜세요",
};

/** 애매한 날: 원인별, 활동별로 다르게 (없으면 기본) */
const MEH: Record<Exclude<Cause, "none">, Partial<Record<Kind, string>> & { _: string }> = {
  rain: {
    _: "우산 하나면 OK ☂️",
    camp: "우중캠 감성이면 OK ☔",
    hike: "우비 챙기면 갈 만해요",
    fish: "비 맞을 각오면 출조",
    ride: "노면 젖음, 천천히",
    golf: "우산 들고 라운딩",
    ski: "눈 대신 비 섞일 수도",
  },
  wind: {
    _: "모자 날아가요, 꽉 잡기",
    camp: "타프는 꽉 묶고 가세요 💨",
    hike: "가도 됨, 정상은 칼바람",
    fish: "바람 좀 붐, 원투는 고생",
    sea: "바람 좀 붐, 파도 조심",
    ride: "맞바람 구간 다리 터짐 주의",
    golf: "OB 나면 바람 탓 가능",
    air: "바람 세요, 비행은 신중히",
  },
  wave: { _: "너울 있어요, 멀미약 챙기기" },
  cold: {
    _: "가도 됨, 옷 한 겹 더",
    camp: "가도 됨, 밤엔 패딩 필수 🥶",
    hike: "가도 됨, 핫팩 2개",
    golf: "손 시려요, 핫팩 챙기기",
  },
  heat: { _: "더위 조심, 물 넉넉히", ski: "눈이 질척할 수 있어요" },
};

const CAUSE_EMOJI: Record<Exclude<Cause, "none">, string> = { rain: "☔", wind: "💨", wave: "🌊", cold: "🧤", heat: "🥵" };
const KIND_EMOJI: Record<Kind, string> = { camp: "⛺", hike: "⛰️", fish: "🎣", sea: "🌊", ride: "🚴", golf: "⛳", ski: "🏂", air: "🪂", trip: "🧳" };

const r = (x: number | null) => (x == null ? "-" : `${Math.round(x)}`);

function subText(level: VerdictLevel, cause: Cause, kind: Kind, v: VerdictDay): string {
  if (level === "go") {
    if ((v.tMin ?? 99) < 0) return kind === "camp" ? "단, 밤엔 영하라 침낭은 겨울용으로" : "단, 아침저녁은 영하라 따뜻하게";
    if ((v.tMax ?? 0) >= 28) return "단, 낮엔 더우니 물 넉넉히";
    return "비·바람 걱정 없어요";
  }
  switch (cause) {
    case "rain":
      return `비 ${v.rain}mm${v.prob != null ? ` (확률 ${v.prob}%)` : ""} 예보`;
    case "wind":
      return `돌풍 최대 ${r(v.gust)}m/s`;
    case "wave":
      return `파고 최대 ${v.wave?.toFixed(1)}m`;
    case "cold":
      return kind === "camp" ? `밤 최저 ${r(v.tMin)}°, 침낭은 겨울용으로` : `낮 최고 ${r(v.tMax)}°, 바람막이 필수`;
    case "heat":
      return `낮 최고 ${r(v.tMax)}°`;
    default:
      return "";
  }
}

export function dayVerdict(v: VerdictDay, leisure: LeisureId, group: GroupId): Verdict {
  const kind = kindOf(leisure, group);
  const { level, cause } = judge(v, kind);
  const title = level === "go" ? GO[kind] : level === "stop" ? STOP[kind] : (MEH[cause as Exclude<Cause, "none">][kind] ?? MEH[cause as Exclude<Cause, "none">]._);
  const emoji = level === "go" ? KIND_EMOJI[kind] : cause === "none" ? KIND_EMOJI[kind] : CAUSE_EMOJI[cause];
  const [windMeh] = WIND[kind];
  const sea = kind === "fish" || kind === "sea";
  const chips: VerdictChip[] = [
    { text: `${codeIcon(v.code)} ${codeInfo(v.code).label}`, bad: false },
    { text: `☔ 비 ${v.rain}mm`, bad: v.rain >= 1 },
    { text: `💨 돌풍 ${r(v.gust)}m/s`, bad: (v.gust ?? 0) >= windMeh },
  ];
  if (sea && v.wave != null) chips.push({ text: `🌊 파고 ${v.wave.toFixed(1)}m`, bad: v.wave >= 1.2 });
  chips.push({ text: `🌡️ ${r(v.tMin)}° / ${r(v.tMax)}°`, bad: cause === "cold" || cause === "heat" || (level === "go" && (v.tMin ?? 99) < 0) });
  return { level, cause, emoji, title, sub: subText(level, cause, kind, v), chips };
}

/**
 * 판정 캡처에 붙는 B급 칭호 ("이 날 잡은 사람: 🧚 날씨 요정").
 * 단톡방에서 날짜 정한 사람을 놀리거나 칭찬하는 용도. 같은 장소·날짜면 늘 같은 칭호가 나오게 seed로 고른다.
 */
const LUCK: Record<VerdictLevel, Partial<Record<Cause, string[]>> & { _: string[] }> = {
  go: { _: ["🧚 날씨 요정", "☀️ 태양신의 총애를 받는 자", "🍀 날짜 고르기 금손", "😎 하늘이 돕는 사람"] },
  meh: {
    _: ["🤏 아슬아슬 줄타기 장인"],
    rain: ["🌂 우산 챙기는 현자", "🌦 반반 확률 도박사"],
    wind: ["🌬 바람의 아이", "🪁 연 날리기 전문가"],
    wave: ["🌊 파도 조련사"],
    cold: ["🧤 핫팩 수집가", "🧣 내복 홍보대사"],
    heat: ["🥵 사우나 애호가"],
  },
  stop: {
    _: ["🙈 날짜 다시 고르기 장인"],
    rain: ["☔ 비구름 소환사", "🐸 개구리 왕자(공주)"],
    wind: ["🌪 태풍의 절친", "🍃 날려 보내기 전문가"],
    wave: ["🐉 용왕님 초대손님"],
    cold: ["🥶 동장군 베프", "🧊 냉동실 탐험가"],
    heat: ["🔥 불지옥 투어 가이드"],
  },
};

export function luckTitle(v: Pick<Verdict, "level" | "cause">, seed: string): string {
  const list = LUCK[v.level][v.cause] ?? LUCK[v.level]._;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

/** 공유 그림에 넣을 때 그림 글자(이모지)를 뗀다 (미리보기 그림 폰트에 이모지가 없다) */
export const stripEmoji = (t: string) => t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").replace(/\s+/g, " ").trim();

/** 판정 공유 링크의 미리보기 제목 ("남한산성 캠핑, 11/7(토) 가도 될까?"). 날짜가 이상하면 null */
export function verdictShareTitle(name: string, label: string, date: string | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return `${name} ${label}, ${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}(${weekdayKo(date)}) 가도 될까?`;
}

/**
 * 미리보기 그림에서 판정할 날: 링크에 담긴 날(vd) → 보고 있는 기간 안의 다가오는 토요일 → 기간의 첫날.
 * dates는 오늘 이후 예보 날짜(오름차순), inPeriod는 그 날짜가 보고 있는 기간 안인지.
 */
export function pickVerdictDate(dates: string[], vd: string | null | undefined, inPeriod: (date: string) => boolean = () => true): string | null {
  if (vd && dates.includes(vd)) return vd;
  const shown = dates.filter(inPeriod);
  const pool = shown.length ? shown : dates;
  return pool.find((d) => weekdayKo(d) === "토") ?? pool[0] ?? null;
}

/** 신호등 한 줄에 넣을 날짜들: 오늘부터 n일, 판정할 날이 그 뒤면 그날이 보이게 뒤로 민다 */
export function signalWindow(dates: string[], picked: string, n = 7): string[] {
  const i = dates.indexOf(picked);
  const start = i < n ? 0 : Math.max(0, Math.min(i - (n - 3), dates.length - n));
  return dates.slice(start, start + n);
}
