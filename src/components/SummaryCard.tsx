import { scoreDay, type Leisure } from "@/lib/leisure";
import { periodNights, type Period } from "@/lib/period";
import { shortDateKo } from "@/lib/time";
import type { DayForecast } from "@/lib/weather/types";
import { TempChart } from "./TempChart";

export function periodLabel(p: Period) {
  const { days, nights } = periodNights(p);
  if (days === 1) return shortDateKo(p.from);
  return `${shortDateKo(p.from)} ~ ${shortDateKo(p.to)} · ${nights}박 ${days}일`;
}

const nums = (xs: (number | null)[]) => xs.filter((v): v is number => v != null);

export function SummaryCard({ days, leisure, period }: { days: DayForecast[]; leisure: Leisure; period: Period }) {
  if (days.length === 0) return null;
  const lows = nums(days.map((d) => d.tMin));
  const highs = nums(days.map((d) => d.tMax));
  const gusts = nums(days.map((d) => d.gustMax));
  const rain = Math.round(days.reduce((a, d) => a + d.precipSum, 0) * 10) / 10;
  const rainyDays = days.filter((d) => d.precipSum >= 1).length;
  const scored = days.map((d) => ({ d, s: scoreDay(d, leisure.id) }));
  const rank = { good: 0, fair: 1, bad: 2 } as const;
  const best = [...scored].sort((a, b) => rank[a.s.grade] - rank[b.s.grade] || a.d.precipSum - b.d.precipSum)[0];

  return (
    <section className="card" aria-label="기간 요약">
      <h2 className="card-title">{periodLabel(period)}</h2>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">최저 / 최고</div>
          <div className="stat-value">
            {lows.length ? Math.round(Math.min(...lows)) : "-"}° / {highs.length ? Math.round(Math.max(...highs)) : "-"}°
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">강수 합계</div>
          <div className="stat-value" style={{ color: rain >= 1 ? "var(--rain)" : undefined }}>
            {rain}mm{rainyDays > 0 && <span className="muted"> · {rainyDays}일</span>}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">최대 돌풍</div>
          <div className="stat-value" style={{ color: gusts.length && Math.max(...gusts) >= 10 ? "var(--coral)" : undefined }}>
            {gusts.length ? Math.round(Math.max(...gusts)) : "-"}m/s
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">{leisure.label} 좋은 날</div>
          <div className="stat-value">
            {scored.filter((x) => x.s.grade === "good").length}일<span className="muted"> / {days.length}일</span>
          </div>
        </div>
      </div>
      {days.length > 1 && best && (
        <div className="best">
          <span>{leisure.emoji}</span>
          <span>
            {leisure.label} 하기 가장 좋은 날은 {shortDateKo(best.d.date)} ({best.s.label})
          </span>
        </div>
      )}
      {days.length > 1 && (
        <div className="grade-strip" aria-label="날짜별 적합도">
          {scored.map(({ d, s }) => (
            <div className="grade-cell" key={d.date} title={`${shortDateKo(d.date)} ${s.label}`}>
              <i className={s.grade} />
              {Number(d.date.slice(8))}
            </div>
          ))}
        </div>
      )}
      <TempChart days={days} />
    </section>
  );
}
