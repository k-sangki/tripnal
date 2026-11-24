import data from "@/data/mountain-climate.json";

/**
 * 명산 월별 산행 준비표 (2026-11-24): 정상 일출 시각, 새벽·한낮 평년 기온, 비, 옷차림.
 * 기온·비는 NASA POWER 평년값을 정상 해발로 보정한 값 (collector/mountain_climate.py).
 * 일출은 매달 15일, 정상 높이에서 보이는 지평선(눈높이만큼 낮아짐) 기준 계산.
 */
interface Clim {
  hi: number[];
  lo: number[];
  rain: number[];
}
const CLIMATE = data as Record<string, Clim>;

export interface MountainMonthRow {
  m: number;
  sunrise: string; // "07:32"
  lo: number;
  hi: number;
  rain: number;
  wear: string;
}

const RAD = Math.PI / 180;

/** NOAA 근사식, 한국시간(UTC+9) 일출 분 단위 */
export function sunriseKst(lat: number, lon: number, elevation: number, year: number, month: number, day: number): number {
  const doy = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);
  const g = ((2 * Math.PI) / 365) * (doy - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  // 대기 굴절·해 반지름(0.833°) + 높은 곳에서 지평선이 내려간 만큼(약 0.0293°·√해발m)
  const alt = -(0.833 + 0.0293 * Math.sqrt(Math.max(0, elevation)));
  const cosH = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) / (Math.cos(lat * RAD) * Math.cos(decl));
  const ha = Math.acos(Math.min(1, Math.max(-1, cosH))) / RAD;
  const utcMin = 720 - 4 * (lon + ha) - eqt;
  return utcMin + 540;
}

const hhmm = (min: number) => {
  const t = Math.round(min);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** 새벽(일출 무렵) 기온 기준 옷차림. 정상은 바람이 더해지면 체감이 더 낮다. */
export function wearFor(lo: number, hi: number): string {
  let w: string;
  if (lo <= -10) w = "두꺼운 패딩·방한모·두꺼운 장갑";
  else if (lo <= -3) w = "패딩이나 두꺼운 플리스+방풍 재킷·장갑";
  else if (lo <= 3) w = "플리스+방풍 재킷·얇은 장갑";
  else if (lo <= 12) w = "긴팔+바람막이";
  else w = "반팔+바람막이(땀 식을 때)";
  if (lo <= -5 || hi <= 3) w += ", 아이젠";
  return w;
}

export function mountainMonths(slug: string, lat: number, lon: number, elevation: number): MountainMonthRow[] | null {
  const c = CLIMATE[slug];
  if (!c) return null;
  return c.hi.map((hi, i) => ({
    m: i + 1,
    sunrise: hhmm(sunriseKst(lat, lon, elevation, 2026, i + 1, 15)),
    lo: Math.round(c.lo[i]) || 0,
    hi: Math.round(hi) || 0,
    rain: c.rain[i],
    wear: wearFor(c.lo[i], hi),
  }));
}
