/**
 * 활동(레저)과 기상 지표.
 * 활동은 그룹으로 묶이고, 그룹마다 주로 봐야 할 지표가 있다.
 * 표에서는 그 지표를 맨 위로 올리고, 나머지 기본 지표는 그 아래에 둔다.
 * 기본 지표가 아닌 추가 지표 중 그 활동에 필요 없는 것만 "더보기"에 접어 둔다.
 */

/** 원래부터 보여주던 기본 지표. 어떤 활동에서도 접지 않는다 (강수 확률은 강수 칸 안에 함께 보여준다) */
export const BASE_METRICS = ["temp", "feels", "precip", "wind", "gust"] as const;

/** 추가 지표. 활동의 주 지표가 아니면 더보기에 들어간다 (이 순서로) */
export const EXTRA_METRICS = [
  "cloud",
  "wave",
  "windWave",
  "tide",
  "snow",
  "ice",
  "road",
  "thunder",
  "visibility",
  "uv",
  "pm10",
  "pm25",
  "windDir",
  "turbulence",
  "range",
] as const;

export type MetricKey = (typeof BASE_METRICS)[number] | (typeof EXTRA_METRICS)[number] | "precipProb";

export const METRIC_LABEL: Record<MetricKey, string> = {
  temp: "기온",
  feels: "체감",
  precip: "강수",
  precipProb: "확률",
  cloud: "구름",
  wind: "풍속",
  gust: "돌풍",
  wave: "파고",
  windWave: "풍랑",
  tide: "물때",
  snow: "적설",
  ice: "결빙",
  road: "노면",
  thunder: "낙뢰",
  visibility: "가시",
  uv: "자외선",
  pm10: "미세",
  pm25: "초미세",
  windDir: "풍향",
  turbulence: "기류",
  range: "일교차",
};

export type GroupId = "marine" | "active" | "camp" | "snow" | "view" | "outdoor" | "air";

export interface ActivityGroup {
  id: GroupId;
  /** 이 그룹에서 중요하게 봐야 하는 지표 (화면에 그룹 이름으로는 표시하지 않는다) */
  primary: MetricKey[];
  /** 일출·일몰 중 굵게 보여줄 것 */
  sun?: "sunrise" | "sunset" | "both";
}

/** 그룹 순서가 곧 활동 버튼과 표의 순서 */
export const GROUPS: ActivityGroup[] = [
  // 일교차·강풍·강수
  { id: "camp", primary: ["range", "wind", "gust", "precip"] },
  // 강수량·낙뢰·노면
  { id: "active", primary: ["precip", "thunder", "road"], sun: "both" },
  // 파고·물때·풍랑
  { id: "marine", primary: ["wave", "tide", "windWave"], sun: "sunrise" },
  // 미세먼지·자외선·체감온도
  { id: "outdoor", primary: ["pm10", "pm25", "uv", "feels"] },
  // 기온·결빙·적설량
  { id: "snow", primary: ["temp", "ice", "snow"] },
  // 풍속·풍향·기류
  { id: "air", primary: ["wind", "windDir", "turbulence"] },
  // 가시거리·구름
  { id: "view", primary: ["visibility", "cloud"], sun: "both" },
];

export const ACTIVITIES = [
  { id: "fishing", label: "낚시", emoji: "🎣", group: "marine" },
  { id: "surfing", label: "서핑", emoji: "🏄", group: "marine" },
  { id: "diving", label: "다이빙/스노클링", emoji: "🤿", group: "marine" },
  { id: "yacht", label: "요트", emoji: "⛵", group: "marine" },
  { id: "island", label: "섬 여행", emoji: "🏝️", group: "marine" },
  { id: "hiking", label: "등산/트레킹", emoji: "⛰️", group: "active" },
  { id: "golf", label: "골프", emoji: "⛳", group: "active" },
  { id: "cycling", label: "자전거", emoji: "🚴", group: "active" },
  { id: "tennis", label: "테니스", emoji: "🎾", group: "active" },
  { id: "climbing", label: "암벽 등반", emoji: "🧗", group: "active" },
  { id: "camping", label: "캠핑", emoji: "🏕️", group: "camp" },
  { id: "ski", label: "스키/스노보드", emoji: "🏂", group: "snow" },
  { id: "icefishing", label: "얼음낚시", emoji: "🧊", group: "snow" },
  { id: "photo", label: "사진촬영", emoji: "📷", group: "view" },
  { id: "drive", label: "드라이브", emoji: "🚗", group: "view" },
  { id: "sunview", label: "일출/일몰 감상", emoji: "🌅", group: "view" },
  { id: "running", label: "러닝", emoji: "🏃", group: "outdoor" },
  { id: "travel", label: "여행", emoji: "🧳", group: "outdoor" },
  { id: "picnic", label: "피크닉/산책", emoji: "🧺", group: "outdoor" },
  { id: "badminton", label: "배드민턴", emoji: "🏸", group: "air" },
  { id: "drone", label: "드론 비행", emoji: "🚁", group: "air" },
  { id: "paragliding", label: "패러글라이딩", emoji: "🪂", group: "air" },
] as const satisfies readonly { id: string; label: string; emoji: string; group: GroupId }[];

export type LeisureId = (typeof ACTIVITIES)[number]["id"];

export interface Leisure {
  id: LeisureId;
  label: string;
  emoji: string;
  group: GroupId;
  /** 표에 보이는 지표, 위에서부터 */
  rows: MetricKey[];
  /** 더보기에 접어 두는 지표 */
  more: MetricKey[];
  /** 같은 그룹 활동 이름들 ("등산/트레킹"은 "등산", "트레킹"으로 나눈다) */
  groupItems: string[];
  /** groupItems를 점으로 이은 것 (제목·캡처에 쓴다) */
  groupLabel: string;
  /** 주 지표 (강조) */
  emphasis: MetricKey[];
  sun?: "sunrise" | "sunset" | "both";
}

/** 기온·체감은 항상 맨 위에 둔다 (날씨 아이콘 바로 아래) */
export const TOP_METRICS: MetricKey[] = ["temp", "feels"];

/** 기온·체감 다음에 그룹의 주 지표, 그 아래 나머지 기본 지표, 필요 없는 추가 지표는 더보기로 */
export function rowsForGroup(g: ActivityGroup): { rows: MetricKey[]; more: MetricKey[] } {
  const primary = g.primary.filter((k) => !TOP_METRICS.includes(k));
  const rest: MetricKey[] = BASE_METRICS.filter((k) => !TOP_METRICS.includes(k) && !primary.includes(k));
  // 주 지표에 풍속만 있고 돌풍이 없으면 돌풍을 부 지표 맨 앞에 둔다
  if (primary.includes("wind") && rest.includes("gust")) {
    rest.splice(rest.indexOf("gust"), 1);
    rest.unshift("gust");
  }
  return {
    rows: [...TOP_METRICS, ...primary, ...rest],
    more: EXTRA_METRICS.filter((k) => !primary.includes(k)),
  };
}

export const LEISURES: Leisure[] = ACTIVITIES.map((a) => {
  const g = GROUPS.find((x) => x.id === a.group)!;
  const groupItems = ACTIVITIES.filter((x) => x.group === a.group).flatMap((x) => x.label.split("/"));
  return { ...a, ...rowsForGroup(g), groupItems, groupLabel: groupItems.join(" · "), emphasis: g.primary, sun: g.sun };
});

export function getLeisure(id: string | null | undefined): Leisure {
  return LEISURES.find((l) => l.id === id) ?? LEISURES.find((l) => l.id === "camping")!;
}
