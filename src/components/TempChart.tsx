import { shortDateKo } from "@/lib/time";
import type { DayForecast } from "@/lib/weather/types";

/** 선택 기간의 3시간 기온 선 + 강수 막대 */
export function TempChart({ days }: { days: DayForecast[] }) {
  const slots = days.flatMap((d) => d.slots.map((s) => ({ ...s, date: d.date })));
  if (slots.length < 2) return null;

  const W = 640;
  const H = 150;
  const top = 18;
  const bottom = 26;
  const temps = slots.map((s) => s.temp).filter((t): t is number => t != null);
  const tMin = Math.floor(Math.min(...temps)) - 1;
  const tMax = Math.ceil(Math.max(...temps)) + 1;
  const x = (i: number) => (i / (slots.length - 1)) * (W - 8) + 4;
  const y = (t: number) => top + (1 - (t - tMin) / (tMax - tMin || 1)) * (H - top - bottom);
  const maxRain = Math.max(5, ...slots.map((s) => s.precip ?? 0));
  const barW = Math.max(2, (W / slots.length) * 0.6);

  const path = slots
    .map((s, i) => (s.temp == null ? null : `${x(i).toFixed(1)},${y(s.temp).toFixed(1)}`))
    .filter(Boolean)
    .join(" L");

  const dayStarts = slots.map((s, i) => (i === 0 || s.date !== slots[i - 1].date ? i : -1)).filter((i) => i >= 0);
  const labelEvery = Math.ceil(dayStarts.length / 8);
  const hiIdx = slots.findIndex((s) => s.temp === Math.max(...temps));
  const loIdx = slots.findIndex((s) => s.temp === Math.min(...temps));

  return (
    <div className="chart" aria-label="기온·강수 그래프">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {dayStarts.map((i, k) => (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={top - 8} y2={H - bottom} stroke="#E5E8EB" strokeWidth="1" />
            {k % labelEvery === 0 && (
              <text x={x(i) + 3} y={H - 8} fontSize="12" fill="#8B95A1">
                {shortDateKo(slots[i].date)}
              </text>
            )}
          </g>
        ))}
        {slots.map((s, i) =>
          s.precip && s.precip >= 0.1 ? (
            <rect
              key={s.time}
              x={x(i) - barW / 2}
              width={barW}
              y={H - bottom - (s.precip / maxRain) * 50}
              height={(s.precip / maxRain) * 50}
              rx="1.5"
              fill="#3B7BFF"
              opacity="0.55"
            />
          ) : null,
        )}
        <path d={`M${path}`} fill="none" stroke="#0E3B36" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {[hiIdx, loIdx].map((i, k) => (
          <g key={k}>
            <circle cx={x(i)} cy={y(slots[i].temp!)} r="4" fill={k === 0 ? "#FF6B4A" : "#3B7BFF"} stroke="#fff" strokeWidth="1.5" />
            <text
              x={Math.min(Math.max(x(i), 16), W - 16)}
              y={k === 0 ? y(slots[i].temp!) - 8 : y(slots[i].temp!) + 16}
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
              fill={k === 0 ? "#FF6B4A" : "#3B7BFF"}
            >
              {Math.round(slots[i].temp!)}°
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
