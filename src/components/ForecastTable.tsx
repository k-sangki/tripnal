"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { METRIC_LABEL, scoreDay, type Leisure, type MetricKey } from "@/lib/leisure";
import { daySummary, isPast, regroup, slotHead, slotHours, type Interval, stepHours } from "@/lib/interval";
import { weekday, weekdayKo } from "@/lib/time";
import { codeIcon, codeInfo } from "@/lib/weather/codes";
import type { DayForecast, Slot } from "@/lib/weather/types";
import { Cell, UNIT, fmt } from "./cells";

interface Props {
  days: DayForecast[];
  leisure: Leisure;
  interval: Interval;
  today: string;
  nowHour: number;
}

interface Col {
  key: string;
  day: DayForecast;
  hour: number;
  slot: Slot | null;
  /** 날짜의 첫 칸 (구분선) */
  first: boolean;
  isDay: boolean;
  now: boolean;
  mark?: "max" | "min";
}

function wdClass(date: string) {
  const w = weekday(date);
  return w === 6 ? "d-sat" : w === 0 ? "d-sun" : undefined;
}

function dateText(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
}

function toMin(hm: string | null, fallback: number) {
  if (!hm) return fallback;
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** 시간 간격 표의 열 목록. 오늘 지난 칸은 비워 둔다. */
function buildCols(days: DayForecast[], step: number, today: string, nowHour: number): Col[] {
  const cols: Col[] = [];
  for (const d of days) {
    const slots = regroup(d.slots, step);
    const rise = toMin(d.sunrise, 6 * 60);
    const set = toMin(d.sunset, 18 * 60);
    const dayCols: Col[] = slotHours(step).map((h, i) => {
      const s = slots.find((x) => x.hour === h) ?? null;
      const past = d.date === today && isPast(h, step, nowHour);
      const mid = (h + step / 2) * 60;
      return {
        key: `${d.date}-${h}`,
        day: d,
        hour: h,
        slot: past ? null : s,
        first: i === 0,
        isDay: s ? s.isDay : mid >= rise && mid <= set,
        now: d.date === today && h <= nowHour && nowHour < h + step,
      };
    });
    // 그날 보이는 칸 중 가장 높은·낮은 기온
    const shown = dayCols.filter((c) => c.slot?.temp != null);
    if (shown.length > 1) {
      const hi = shown.reduce((a, b) => (b.slot!.temp! > a.slot!.temp! ? b : a));
      const lo = shown.reduce((a, b) => (b.slot!.temp! < a.slot!.temp! ? b : a));
      if (hi !== lo) {
        hi.mark = "max";
        lo.mark = "min";
      }
    }
    cols.push(...dayCols);
  }
  return cols;
}

function RowHead({ k, em }: { k: MetricKey | "hi" | "lo" | "sunrise" | "sunset"; em?: boolean }) {
  const label =
    k === "hi" ? "최고" : k === "lo" ? "최저" : k === "sunrise" ? "일출" : k === "sunset" ? "일몰" : METRIC_LABEL[k];
  const unit = k === "hi" || k === "lo" ? "°C" : k === "sunrise" || k === "sunset" ? "" : UNIT[k];
  return (
    <th scope="row" className={`lbl${em ? " em" : ""}`}>
      <span>{label}</span>
      {unit && <small>{unit}</small>}
    </th>
  );
}

const MORE_KEY = "tripnal:more";

/**
 * 선택한 기간 전체를 한 카드 안의 표 하나로 보여주고 좌우로 넘겨 본다.
 * 날짜 사이에는 구분선, 시각 칸은 낮·밤 색, 지금 칸은 진하게 표시한다.
 */
export function ForecastTable({ days, leisure, interval, today, nowHour }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [edges, setEdges] = useState({ prev: false, next: false });
  const daily = interval === "day";
  const step = stepHours(interval);
  const cols = daily ? [] : buildCols(days, step, today, nowHour);
  const em = (k: MetricKey) => leisure.emphasis.includes(k);
  const sunEm = (k: "sunrise" | "sunset") => leisure.sun === k || leisure.sun === "both";

  useEffect(() => {
    try {
      // 접어 둔 지표를 펼쳤는지 기억한다
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(window.localStorage.getItem(MORE_KEY) === "1");
    } catch {}
  }, []);

  function toggle() {
    setOpen((o) => {
      try {
        window.localStorage.setItem(MORE_KEY, o ? "0" : "1");
      } catch {}
      return !o;
    });
  }

  /** 날짜(하루 단위는 열)마다 시작 위치 */
  const stops = useCallback(() => {
    const el = scroller.current;
    if (!el) return [];
    const lbl = (el.querySelector("th.lbl") as HTMLElement | null)?.offsetWidth ?? 0;
    const sel = daily ? "thead th.dcol" : "thead th.dh";
    const xs = [...el.querySelectorAll<HTMLElement>(sel)].map((th) => th.offsetLeft - lbl);
    // 오늘은 지난 빈칸 대신 지금 칸에서 시작한다
    const now = el.querySelector<HTMLElement>("thead th.now");
    if (!now || daily) return xs;
    const nx = now.offsetLeft - lbl;
    return [nx, ...xs.filter((x) => x > nx)];
  }, [daily]);

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ prev: el.scrollLeft > 4, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  // 처음과 기간·간격이 바뀔 때: 지금 시각 칸을 맨 앞(항목 이름 바로 옆)에 둔다
  const key = `${interval}|${days.map((d) => d.date).join(",")}`;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const now = el.querySelector<HTMLElement>("thead th.now");
    const lbl = (el.querySelector("th.lbl") as HTMLElement | null)?.offsetWidth ?? 0;
    el.scrollLeft = now ? now.offsetLeft - lbl : 0;
    updateEdges();
  }, [key, updateEdges]);

  function go(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const xs = stops();
    const cur = el.scrollLeft;
    const target = dir > 0 ? xs.find((x) => x > cur + 4) : [...xs].reverse().find((x) => x < cur - 4);
    el.scrollTo({ left: target ?? (dir > 0 ? el.scrollWidth : 0), behavior: "smooth" });
  }

  const rows = leisure.rows;
  const more = leisure.more;

  return (
    <article className="card ft">
      <div className="ft-bar">
        <button className="ft-nav" disabled={!edges.prev} onClick={() => go(-1)}>
          ‹ 이전 날
        </button>
        <button className="ft-nav" disabled={!edges.next} onClick={() => go(1)}>
          다음 날 ›
        </button>
      </div>
      <div className="ft-wrap">
        <div className="ft-scroll" ref={scroller} onScroll={updateEdges}>
          {daily ? (
            <DailyTable days={days} leisure={leisure} today={today} rows={rows} more={more} open={open} em={em} sunEm={sunEm} />
          ) : (
            <table className={`ftab s${step}`}>
              <thead>
                <tr className="ft-date">
                  <th className="lbl" />
                  {days.map((d) => {
                    const score = scoreDay(d, leisure.id);
                    const n = slotHours(step).length;
                    return (
                      <th key={d.date} colSpan={n} className="dh">
                        <div className="dh-in">
                          <div className="dh-l1">
                            {d.date === today && <span className="today">오늘</span>}
                            <b className={wdClass(d.date)}>
                              {dateText(d.date)}
                              <small>({weekdayKo(d.date)})</small>
                            </b>
                            <i className={`gdot ${score.grade}`} title={score.reasons.join(", ")}>
                              {leisure.emoji} {score.label}
                            </i>
                          </div>
                          <div className="dh-l2">
                            <span className="hl">
                              <span className="v-hi">{fmt(d.tMax, "°")}</span>/<span className="v-lo">{fmt(d.tMin, "°")}</span>
                            </span>
                            <span className={`sun-t${sunEm("sunrise") ? " em" : ""}`}>🌅{d.sunrise ?? "-"}</span>
                            <span className={`sun-t${sunEm("sunset") ? " em" : ""}`}>🌇{d.sunset ?? "-"}</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr className="ft-time">
                  <th className="lbl">
                    <span>시각</span>
                  </th>
                  {cols.map((c) => (
                    <th key={c.key} className={[c.isDay ? "day" : "night", c.first && "ds", c.now && "now"].filter(Boolean).join(" ")}>
                      {c.now ? "지금" : slotHead(c.hour, step)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="r-icon">
                  <th scope="row" className="lbl">
                    <span>날씨</span>
                  </th>
                  {cols.map((c) => (
                    <td key={c.key} className={c.first ? "ds" : undefined} title={c.slot ? codeInfo(c.slot.code).label : undefined}>
                      {c.slot ? codeIcon(c.slot.code, c.slot.isDay) : ""}
                    </td>
                  ))}
                </tr>
                {rows.map((k) => (
                  <SlotRow key={k} k={k} cols={cols} em={em(k)} />
                ))}
              </tbody>
              {more.length > 0 && (
                <tbody className="ft-more" hidden={!open}>
                  {more.map((k) => (
                    <SlotRow key={k} k={k} cols={cols} em={false} />
                  ))}
                </tbody>
              )}
            </table>
          )}
        </div>
      </div>
      {more.length > 0 && (
        <button className="ft-toggle" aria-expanded={open} onClick={toggle}>
          {open ? "접기" : `${more.map((k) => METRIC_LABEL[k]).join("·")} 더보기`}
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </button>
      )}
    </article>
  );
}

function SlotRow({ k, cols, em }: { k: MetricKey; cols: Col[]; em: boolean }) {
  return (
    <tr className={`r-${k}${em ? " em" : ""}`}>
      <RowHead k={k} em={em} />
      {cols.map((c) =>
        c.slot ? (
          <Cell key={c.key} slot={c.slot} metric={k} className={c.first ? "ds" : undefined} mark={k === "temp" ? c.mark : undefined} />
        ) : (
          <td key={c.key} className={c.first ? "ds empty" : "empty"} />
        ),
      )}
    </tr>
  );
}

function DailyTable({
  days,
  leisure,
  today,
  rows,
  more,
  open,
  em,
  sunEm,
}: {
  days: DayForecast[];
  leisure: Leisure;
  today: string;
  rows: MetricKey[];
  more: MetricKey[];
  open: boolean;
  em: (k: MetricKey) => boolean;
  sunEm: (k: "sunrise" | "sunset") => boolean;
}) {
  const cols = days.map((d) => ({ d, s: daySummary(d), score: scoreDay(d, leisure.id) }));
  const metricRow = (k: MetricKey, isEm: boolean) => {
    if (k === "temp") {
      return [
        <tr key="hi" className={`r-temp${isEm ? " em" : ""}`}>
          <RowHead k="hi" em={isEm} />
          {cols.map(({ d }) => (
            <td key={d.date} className="ds t-max">
              {fmt(d.tMax, "°")}
            </td>
          ))}
        </tr>,
        <tr key="lo" className={`r-temp${isEm ? " em" : ""}`}>
          <RowHead k="lo" em={isEm} />
          {cols.map(({ d }) => (
            <td key={d.date} className="ds t-min">
              {fmt(d.tMin, "°")}
            </td>
          ))}
        </tr>,
      ];
    }
    return [
      <tr key={k} className={`r-${k}${isEm ? " em" : ""}`}>
        <RowHead k={k} em={isEm} />
        {cols.map(({ d, s }) => (
          <Cell key={d.date} slot={s} metric={k} className="ds" />
        ))}
      </tr>,
    ];
  };

  return (
    <table className="ftab daily">
      <thead>
        <tr className="ft-time">
          <th className="lbl">
            <span>날짜</span>
          </th>
          {cols.map(({ d }) => (
            <th key={d.date} className={`dcol ds${d.date === today ? " now" : ""}`}>
              <b className={d.date === today ? undefined : wdClass(d.date)}>{d.date === today ? "오늘" : dateText(d.date)}</b>
              <small>{weekdayKo(d.date)}</small>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="r-icon">
          <th scope="row" className="lbl">
            <span>날씨</span>
          </th>
          {cols.map(({ d }) => (
            <td key={d.date} className="ds" title={codeInfo(d.code).label}>
              {codeIcon(d.code)}
            </td>
          ))}
        </tr>
        <tr className="r-grade">
          <th scope="row" className="lbl">
            <span>{leisure.label}</span>
          </th>
          {cols.map(({ d, score }) => (
            <td key={d.date} className="ds" title={score.reasons.join(", ")}>
              <i className={`gdot ${score.grade}`}>{score.label}</i>
            </td>
          ))}
        </tr>
        {rows.flatMap((k) => metricRow(k, em(k)))}
        <tr className={sunEm("sunrise") ? "r-sun em" : "r-sun"}>
          <RowHead k="sunrise" em={sunEm("sunrise")} />
          {cols.map(({ d }) => (
            <td key={d.date} className="ds">
              {d.sunrise ?? "-"}
            </td>
          ))}
        </tr>
        <tr className={sunEm("sunset") ? "r-sun em" : "r-sun"}>
          <RowHead k="sunset" em={sunEm("sunset")} />
          {cols.map(({ d }) => (
            <td key={d.date} className="ds">
              {d.sunset ?? "-"}
            </td>
          ))}
        </tr>
      </tbody>
      {more.length > 0 && (
        <tbody className="ft-more" hidden={!open}>
          {more.flatMap((k) => metricRow(k, false))}
        </tbody>
      )}
    </table>
  );
}
