"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { METRIC_LABEL, type Leisure, type MetricKey } from "@/lib/leisure";
import { daySummary, isPast, regroup, slotHead, slotHours, type Interval, stepHours } from "@/lib/interval";
import { weekday, weekdayKo } from "@/lib/time";
import { codeIcon, codeInfo } from "@/lib/weather/codes";
import type { DayForecast, Slot } from "@/lib/weather/types";
import { Cell, UNIT, bandStyle, fmt } from "./cells";

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
  now: boolean;
  /** 시각 칸 배경 (낮은 흰색, 밤은 어두운 색, 해 뜨고 질 때는 그 사이) */
  sky: { bg: string; dark: boolean };
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

const DAY_RGB = [255, 255, 255];
const NIGHT_RGB = [45, 58, 84];
const TWILIGHT = 40;

/** 그 시각의 어둡기 0(낮)~1(밤). 해 뜨고 지는 앞뒤 40분은 서서히 바뀐다 */
function darkness(min: number, rise: number, set: number) {
  const ramp = (x: number) => Math.min(1, Math.max(0, x));
  return Math.max(ramp((rise + TWILIGHT - min) / (2 * TWILIGHT)), ramp((min - (set - TWILIGHT)) / (2 * TWILIGHT)));
}

function shade(d: number) {
  const c = DAY_RGB.map((v, i) => Math.round(v + (NIGHT_RGB[i] - v) * d));
  return `rgb(${c.join(",")})`;
}

function skyFor(hour: number, step: number, rise: number, set: number) {
  const a = darkness(hour * 60, rise, set);
  const b = darkness((hour + step) * 60, rise, set);
  const m = darkness((hour + step / 2) * 60, rise, set);
  return { bg: `linear-gradient(90deg, ${shade(a)}, ${shade(m)} 50%, ${shade(b)})`, dark: m > 0.5 };
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
      return {
        key: `${d.date}-${h}`,
        day: d,
        hour: h,
        slot: past ? null : s,
        first: i === 0,
        now: d.date === today && h <= nowHour && nowHour < h + step,
        sky: skyFor(h, step, rise, set),
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

type RowKey = MetricKey | "hi" | "lo" | "sunrise" | "sunset";

function RowHead({ k, em }: { k: RowKey; em?: boolean }) {
  const label = k === "hi" ? "최고" : k === "lo" ? "최저" : k === "sunrise" ? "일출" : k === "sunset" ? "일몰" : METRIC_LABEL[k];
  const unit = k === "hi" || k === "lo" ? "°C" : k === "sunrise" || k === "sunset" ? "" : UNIT[k];
  return (
    <th scope="row" className={`lbl${em ? " em" : ""}`}>
      <span>{label}</span>
      {unit && <small>{unit}</small>}
    </th>
  );
}

/** 바다·대기질처럼 자료가 없는 곳(육지, 5일 이후)은 더보기에서 줄을 숨긴다 */
const DATA_FIELD: Partial<Record<MetricKey, keyof Slot>> = {
  wave: "wave",
  windWave: "windWave",
  tide: "tide",
  pm10: "pm10",
  pm25: "pm25",
  uv: "uv",
  visibility: "visibility",
  snow: "snow",
};

function hasData(k: MetricKey, slots: Slot[], days: DayForecast[]) {
  if (k === "tide" && days.some((d) => d.tides.length)) return true;
  const f = DATA_FIELD[k];
  return !f || slots.some((s) => s[f] != null);
}

function rangeText(d: DayForecast) {
  return d.tMax != null && d.tMin != null ? `${Math.round(d.tMax - d.tMin)}°` : "-";
}

function rangeClass(d: DayForecast) {
  const r = d.tMax != null && d.tMin != null ? d.tMax - d.tMin : 0;
  return r >= 15 ? "rg2" : r >= 10 ? "rg1" : undefined;
}

function TideText({ d }: { d: DayForecast }) {
  if (!d.tides.length) return <>-</>;
  return (
    <>
      {d.tides.map((t) => (
        <span key={t.time} className={t.type === "high" ? "tide-h" : "tide-l"}>
          {t.type === "high" ? "▲" : "▼"}
          {t.time}
        </span>
      ))}
    </>
  );
}

const MORE_KEY = "tripnal:more";

/**
 * 선택한 기간 전체를 한 카드 안의 표 하나로 보여주고 좌우로 넘겨 본다.
 * 날짜 사이에는 구분선, 시각 칸은 낮·밤 색, 지금 칸은 밑줄로 표시한다.
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
  const showTides = em("tide");

  useEffect(() => {
    try {
      // 더 많은 날씨 정보를 펼쳤는지 기억한다
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
    el.scrollLeft = now && !daily ? now.offsetLeft - lbl : 0;
    updateEdges();
  }, [key, daily, updateEdges]);

  function go(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const xs = stops();
    const cur = el.scrollLeft;
    const target = dir > 0 ? xs.find((x) => x > cur + 4) : [...xs].reverse().find((x) => x < cur - 4);
    el.scrollTo({ left: target ?? (dir > 0 ? el.scrollWidth : 0), behavior: "smooth" });
  }

  const allSlots = days.flatMap((d) => d.slots);
  const more = leisure.more.filter((k) => hasData(k, allSlots, days));

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
            <DailyTable days={days} today={today} rows={leisure.rows} more={more} open={open} em={em} sunEm={sunEm} />
          ) : (
            <table className={`ftab s${step}`}>
              <thead>
                <tr className="ft-date">
                  <th className="lbl" />
                  {days.map((d) => (
                    <th key={d.date} colSpan={slotHours(step).length} className="dh">
                      <div className="dh-in">
                        <div className="dh-l1">
                          {d.date === today && <span className="today">오늘</span>}
                          <b className={wdClass(d.date)}>
                            {dateText(d.date)}
                            <small>({weekdayKo(d.date)})</small>
                          </b>
                          <span className="hl">
                            <span className="v-hi">{fmt(d.tMax, "°")}</span>/<span className="v-lo">{fmt(d.tMin, "°")}</span>
                          </span>
                        </div>
                        <div className="dh-l2">
                          <span className={`sun-t${sunEm("sunrise") ? " em" : ""}`}>🌅{d.sunrise ?? "-"}</span>
                          <span className={`sun-t${sunEm("sunset") ? " em" : ""}`}>🌇{d.sunset ?? "-"}</span>
                        </div>
                        {showTides && d.tides.length > 0 && (
                          <div className="dh-l2 tides">
                            <TideText d={d} />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
                <tr className="ft-time">
                  <th className="lbl">
                    <span>시각</span>
                  </th>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={[c.sky.dark ? "night" : "day", c.first && "ds", c.now && "now"].filter(Boolean).join(" ")}
                      style={{ background: c.sky.bg }}
                    >
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
                {leisure.rows.map((k) => (
                  <SlotRow key={k} k={k} cols={cols} days={days} step={step} em={em(k)} />
                ))}
              </tbody>
              {more.length > 0 && (
                <tbody className="ft-more" hidden={!open}>
                  {more.map((k) => (
                    <SlotRow key={k} k={k} cols={cols} days={days} step={step} em={false} />
                  ))}
                </tbody>
              )}
            </table>
          )}
        </div>
      </div>
      {more.length > 0 && (
        <button className="ft-toggle" aria-expanded={open} onClick={toggle}>
          {open ? "접기" : "더 많은 날씨 정보 보기"}
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </button>
      )}
    </article>
  );
}

function SlotRow({ k, cols, days, step, em }: { k: MetricKey; cols: Col[]; days: DayForecast[]; step: number; em: boolean }) {
  // 일교차는 하루에 하나라 날짜 칸을 합쳐서 보여준다
  if (k === "range") {
    return (
      <tr className={`r-range${em ? " em" : ""}`}>
        <RowHead k={k} em={em} />
        {days.map((d) => (
          <td key={d.date} colSpan={slotHours(step).length} className={["ds", rangeClass(d)].filter(Boolean).join(" ")}>
            <span className="span-in">
              {rangeText(d)}
              <small>
                {fmt(d.tMin, "°")} → {fmt(d.tMax, "°")}
              </small>
            </span>
          </td>
        ))}
      </tr>
    );
  }
  const band = k === "wind" || k === "gust";
  const val = (c?: Col) => (c?.slot ? (k === "wind" ? c.slot.wind : c.slot.gust) : null);
  return (
    <tr className={`r-${k}${em ? " em" : ""}`}>
      <RowHead k={k} em={em} />
      {cols.map((c, i) =>
        c.slot ? (
          <Cell
            key={c.key}
            slot={c.slot}
            metric={k}
            className={c.first ? "ds" : undefined}
            mark={c.mark}
            style={band ? bandStyle(val(cols[i - 1]), val(c), val(cols[i + 1])) : undefined}
          />
        ) : (
          <td key={c.key} className={c.first ? "ds empty" : "empty"} />
        ),
      )}
    </tr>
  );
}

function DailyTable({
  days,
  today,
  rows,
  more,
  open,
  em,
  sunEm,
}: {
  days: DayForecast[];
  today: string;
  rows: MetricKey[];
  more: MetricKey[];
  open: boolean;
  em: (k: MetricKey) => boolean;
  sunEm: (k: "sunrise" | "sunset") => boolean;
}) {
  const cols = days.map((d) => ({ d, s: daySummary(d) }));
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
    if (k === "range" || k === "tide") {
      return [
        <tr key={k} className={`r-${k}${isEm ? " em" : ""}`}>
          <RowHead k={k} em={isEm} />
          {cols.map(({ d }) => (
            <td key={d.date} className={["ds", k === "range" ? rangeClass(d) : "tide-cell"].filter(Boolean).join(" ")}>
              {k === "range" ? rangeText(d) : <TideText d={d} />}
            </td>
          ))}
        </tr>,
      ];
    }
    const band = k === "wind" || k === "gust";
    const val = (i: number) => (cols[i] ? (k === "wind" ? cols[i].s.wind : cols[i].s.gust) : null);
    return [
      <tr key={k} className={`r-${k}${isEm ? " em" : ""}`}>
        <RowHead k={k} em={isEm} />
        {cols.map(({ d, s }, i) => (
          <Cell key={d.date} slot={s} metric={k} className="ds" style={band ? bandStyle(val(i - 1), val(i), val(i + 1)) : undefined} />
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
