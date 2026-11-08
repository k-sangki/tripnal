import facts from "@/data/golf-facts.json";
import { sunTimes } from "@/lib/weather/aggregate";

/**
 * 골프장 소개 카드 (구글 '대량 생성된 얇은 페이지' 대응 2026-11-09, SK 요청).
 * 기억으로 쓴 특징 대신 자료로 계산한 값만 쓴다 (collector/golf_facts.py → src/data/golf-facts.json).
 */
interface GolfFacts {
  areaHa?: number;
  holes?: number;
  hazards?: number;
  elev?: number[] | null;
  lakes?: { name: string; m: number }[];
  rivers?: { name: string; m: number }[];
  coastM?: number | null;
  clim?: { hi: number[]; lo: number[]; rain: number[]; wind: number[] };
}

export interface GolfIntroRow {
  icon: string;
  label: string;
  text: string;
}

const FACTS = facts as unknown as Record<string, GolfFacts>;

export function golfFacts(slug: string): GolfFacts | undefined {
  return FACTS[slug];
}

/** [4,5,6,9,10] → "4~6월, 9~10월" (12월~2월처럼 해를 넘는 묶음도 잇는다) */
export function monthSpans(ms: number[]): string {
  if (!ms.length) return "";
  const set = new Set(ms);
  if (set.size === 12) return "1~12월";
  // 빠진 달 바로 다음부터 돌면 해를 넘는 묶음이 한 덩어리가 된다
  let start = 1;
  while (set.has(start)) start++;
  const spans: [number, number][] = [];
  for (let k = 0; k < 12; k++) {
    const m = ((start - 1 + k) % 12) + 1;
    if (!set.has(m)) continue;
    const last = spans[spans.length - 1];
    const prev = ((m + 10) % 12) + 1;
    if (last && last[1] === prev) last[1] = m;
    else spans.push([m, m]);
  }
  return spans.map(([a, b]) => (a === b ? `${a}월` : `${a}~${b}월`)).join(", ");
}

const josa = (w: string, a: string, b: string) => {
  const c = w.charCodeAt(w.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${w}${a}`;
  return (c - 0xac00) % 28 ? `${w}${a}` : `${w}${b}`;
};

const km = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`);

function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** 오늘(한국 날짜) 기준 일몰과 18홀 마지막 티오프 권장 시각 */
function lastTeeOff(lat: number, lon: number, today: string): { sunset: string; tee: string } | null {
  const { sunset } = sunTimes(today, lat, lon);
  if (!sunset) return null;
  const [h, m] = sunset.split(":").map(Number);
  // 18홀 약 4시간 30분 + 여유 15분. 10분 단위로 내림
  const t = h * 60 + m - 285;
  return { sunset, tee: hm(Math.floor(t / 10) * 10) };
}

export function golfIntroRows(p: { slug: string; lat: number; lon: number }, today: string): GolfIntroRow[] {
  const f = FACTS[p.slug];
  const rows: GolfIntroRow[] = [];
  if (f) {
    const size = [f.holes ? `${f.holes}홀` : null, f.areaHa ? `코스 넓이 약 ${f.areaHa}ha` : null].filter(Boolean).join(" · ");
    if (size) rows.push({ icon: "⛳", label: "규모", text: f.hazards && f.hazards >= 2 ? `${size} · 지도에 표시된 워터 해저드 ${f.hazards}곳` : size });

    if (f.elev) {
      const [lo, mid, hi] = f.elev;
      const relief = hi - lo;
      const shape =
        relief >= 70
          ? `고저차가 약 ${relief}m인 산악형 코스예요. 오르막·내리막 샷이 많아 거리 계산을 신경 써야 하고, 계곡 쪽으로 바람이 돌기 쉬워요.`
          : relief >= 30
            ? `고저차 약 ${relief}m의 구릉형 코스예요. 홀마다 높낮이가 조금씩 있어요.`
            : `고저차가 약 ${relief}m뿐인 평탄한 코스예요. 걷기 편한 대신 바람을 막아줄 지형이 적어요.`;
      rows.push({ icon: "⛰️", label: "지형", text: shape });
      if (mid >= 150) {
        const d = (mid * 0.0065).toFixed(1);
        rows.push({
          icon: "🌡️",
          label: "고도",
          text:
            `해발 약 ${mid}m(가장 낮은 곳 ${lo}m~높은 곳 ${hi}m)라 바닷가 평지보다 기온이 약 ${d}° 낮아요.` +
            (mid >= 400 ? " 공기가 옅어 같은 클럽으로 공이 조금 더 멀리 가요." : ""),
        });
      } else {
        rows.push({ icon: "🌡️", label: "고도", text: `해발 약 ${mid}m의 낮은 지대라 기온은 주변 시내와 비슷해요.` });
      }
    }

    const water: string[] = [];
    if (f.coastM != null && f.coastM <= 3000)
      water.push(
        f.coastM <= 300
          ? "바다와 붙어 있는 코스라 해풍을 그대로 받아요. 오후로 갈수록 바람이 세지는 날이 많아요."
          : `바다까지 약 ${km(f.coastM)}라 해풍 영향을 받아요. 오후에 바람이 세지는 날이 많아요.`,
      );
    const lake = f.lakes?.[0];
    if (lake)
      water.push(
        `${lake.m <= 100 ? `${josa(lake.name, "이", "가")} 코스 바로 옆에 있어` : `${josa(lake.name, "이", "가")} 약 ${km(lake.m)} 거리에 있어`} 봄·가을 이른 아침엔 안개가 낄 수 있어요.`,
      );
    const river = f.rivers?.[0];
    if (river && !lake)
      water.push(`${josa(river.name, "이", "가")} ${river.m <= 100 ? "코스 옆으로 흘러" : `약 ${km(river.m)} 거리를 흘러`} 일교차 큰 날 아침 안개가 잦은 편이에요.`);
    if (water.length) rows.push({ icon: "💧", label: "물가", text: water.join(" ") });

    const c = f.clim;
    if (c) {
      const good = c.hi.map((h, i) => ({ m: i + 1, h, r: c.rain[i] })).filter((x) => x.h >= 15 && x.h <= 27 && x.r < 160).map((x) => x.m);
      const frost = c.lo.map((l, i) => ({ m: i + 1, l })).filter((x) => x.l <= 0).map((x) => x.m);
      const wet = c.rain.indexOf(Math.max(...c.rain)) + 1;
      const windy = c.wind.indexOf(Math.max(...c.wind)) + 1;
      const parts: string[] = [];
      if (good.length) parts.push(`낮 기온이 15~27°에 비가 적은 달은 ${monthSpans(good)}이에요.`);
      if (frost.length) parts.push(`${monthSpans(frost)}은 아침 평균 기온이 영하라 그린이 얼어 첫 티오프가 늦어지거나 그린이 딱딱할 수 있어요.`);
      else parts.push("한겨울에도 아침 평균 기온이 영하로 내려가지 않는 따뜻한 편이에요.");
      parts.push(`비는 ${wet}월(평년 약 ${c.rain[wet - 1]}mm)에 가장 많고, 바람은 ${windy}월에 가장 세요.`);
      rows.push({ icon: "📅", label: "평년 날씨", text: parts.join(" ") });
    }
  }
  const t = lastTeeOff(p.lat, p.lon, today);
  if (t) rows.push({ icon: "🌇", label: "마지막 티오프", text: `오늘 일몰은 ${t.sunset}이에요. 18홀을 해 지기 전에 마치려면 ${t.tee} 전 티오프가 안전해요.` });
  return rows;
}
