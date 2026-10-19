import { METRIC_LABEL, scoreDay, type Leisure } from "@/lib/leisure";
import { daySummary } from "@/lib/interval";
import { weekday, weekdayKo } from "@/lib/time";
import { codeIcon, codeInfo } from "@/lib/weather/codes";
import type { DayForecast } from "@/lib/weather/types";
import { Cell, UNIT, fmt } from "./cells";

const wdClass = (date: string) => {
  const w = weekday(date);
  return w === 6 ? "d-sat" : w === 0 ? "d-sun" : undefined;
};

/** 하루 단위: 날짜가 열이 되는 표 하나. 좌우로 밀어서 본다. */
export function DaysTable({ days, leisure, today }: { days: DayForecast[]; leisure: Leisure; today: string }) {
  const cols = days.map((d) => ({ d, s: daySummary(d), score: scoreDay(d, leisure.id) }));
  const em = (k: string) => leisure.emphasis.includes(k as never);
  const sunEm = (k: "sunrise" | "sunset") => leisure.sun === k || leisure.sun === "both";

  return (
    <article className="card day">
      <div className="grid-wrap">
        <table className="slots daily">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">날짜</span>
              </th>
              {cols.map(({ d }) => (
                <th scope="col" key={d.date} className={wdClass(d.date)}>
                  {d.date === today ? "오늘" : `${Number(d.date.slice(8))}일`}
                  <small>{weekdayKo(d.date)}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="r-icon">
              <th scope="row">
                <span className="sr-only">날씨</span>
              </th>
              {cols.map(({ d }) => (
                <td key={d.date} title={codeInfo(d.code).label}>
                  {codeIcon(d.code)}
                </td>
              ))}
            </tr>
            <tr className="r-grade">
              <th scope="row">{leisure.emoji}</th>
              {cols.map(({ d, score }) => (
                <td key={d.date} title={score.reasons.join(", ")}>
                  <i className={`gdot ${score.grade}`}>{score.label}</i>
                </td>
              ))}
            </tr>
            <tr className="r-temp">
              <th scope="row">최고</th>
              {cols.map(({ d }) => (
                <td key={d.date} className="v-hi">
                  {fmt(d.tMax, "°")}
                </td>
              ))}
            </tr>
            <tr className="r-temp lo">
              <th scope="row">최저</th>
              {cols.map(({ d }) => (
                <td key={d.date} className="v-lo">
                  {fmt(d.tMin, "°")}
                </td>
              ))}
            </tr>
            {leisure.order.map((k) => (
              <tr key={k} className={em(k) ? "em" : undefined}>
                <th scope="row" title={UNIT[k]}>
                  {METRIC_LABEL[k]}
                </th>
                {cols.map(({ d, s }) => (
                  <Cell key={d.date} slot={s} metric={k} />
                ))}
              </tr>
            ))}
            <tr className={`r-sun${sunEm("sunrise") ? " em" : ""}`}>
              <th scope="row">일출</th>
              {cols.map(({ d }) => (
                <td key={d.date}>{d.sunrise ?? "-"}</td>
              ))}
            </tr>
            <tr className={`r-sun${sunEm("sunset") ? " em" : ""}`}>
              <th scope="row">일몰</th>
              {cols.map(({ d }) => (
                <td key={d.date}>{d.sunset ?? "-"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small-note">체감은 하루 중 가장 낮은 값, 강수는 그날 하루 합계입니다.</p>
    </article>
  );
}
