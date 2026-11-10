"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SLOGAN } from "@/lib/brand";
import type { Leisure } from "@/lib/leisure";
import { weekday, weekdayKo } from "@/lib/time";
import Link from "next/link";
import { fetchForecast } from "@/lib/forecastClient";
import { trackEvent, trackShare } from "@/lib/track";
import { dayVerdict, luckTitle, verdictDay, type VerdictLevel } from "@/lib/verdict";
import type { DayForecast } from "@/lib/weather/types";
import { captureElement } from "./CaptureSheet";

/** 같은 레저의 가까운 장소 (서버에서 거리순으로 넘긴다) */
export interface NearbyPlace {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  km: number;
}

const RANK: Record<VerdictLevel, number> = { go: 0, meh: 1, stop: 2 };
const DOT: Record<VerdictLevel, string> = { go: "🟢", meh: "🟡", stop: "🔴" };

interface Props {
  nearby?: NearbyPlace[];
  days: DayForecast[];
  leisure: Leisure;
  placeName: string;
  today: string;
  /** 공유 링크로 들어왔을 때 고를 날짜 (?vd=) */
  initialDate: string | null;
}

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 처음 고를 날: 공유받은 날 → 다가오는 토요일 → 오늘 이후 첫날 */
function pickDefault(days: DayForecast[], today: string, initial: string | null): string | null {
  if (initial && days.some((d) => d.date === initial)) return initial;
  const ahead = days.filter((d) => d.date >= today);
  return (ahead.find((d) => weekday(d.date) === 6) ?? ahead[0] ?? days[0])?.date ?? null;
}

/** "가도 될까?" 판정 카드 (예보표 위). 근거 숫자를 칩으로 같이 보여준다 */
export function VerdictCard({ days, leisure, placeName, today, initialDate, nearby }: Props) {
  const [date, setDate] = useState(() => pickDefault(days, today, initialDate));
  const [toast, setToast] = useState<string | null>(null);
  /** 가까운 곳 예보 (날짜별 하루 요약). 판정이 나쁜 날을 처음 볼 때 한 번만 받는다 */
  const [alts, setAlts] = useState<Record<string, DayForecast[]> | null>(null);
  const [wantAlts, setWantAlts] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // 기간을 바꿔 고른 날이 빠지면 다시 고른다
  const day = days.find((d) => d.date === date) ?? days.find((d) => d.date === pickDefault(days, today, null));
  const v = useMemo(() => (day ? dayVerdict(verdictDay(day), leisure.id, leisure.group) : null), [day, leisure]);
  const needAlts = !!v && v.level !== "go" && !!nearby?.length;
  // 렌더 중 바로 받지 않고, 나쁜 날을 한 번이라도 보면 그때부터 받는다
  if (needAlts && !wantAlts) setWantAlts(true);

  useEffect(() => {
    if (!wantAlts || !nearby?.length) return;
    const ctrl = new AbortController();
    Promise.all(nearby.map((p) => fetchForecast(p, ctrl.signal).then((f) => [p.slug, f.days] as const).catch(() => null))).then((rows) => {
      if (!ctrl.signal.aborted) setAlts(Object.fromEntries(rows.filter((r) => r != null)));
    });
    return () => ctrl.abort();
  }, [wantAlts, nearby]);

  // 같은 날, 여기보다 판정이 좋은 가까운 곳 (좋은 순 → 가까운 순, 3곳)
  const better = useMemo(() => {
    if (!v || v.level === "go" || !alts || !nearby || !day) return null;
    return nearby
      .map((p) => {
        const d = alts[p.slug]?.find((x) => x.date === day.date);
        return d ? { p, level: dayVerdict(verdictDay(d), leisure.id, leisure.group).level } : null;
      })
      .filter((x): x is { p: NearbyPlace; level: VerdictLevel } => !!x && RANK[x.level] < RANK[v.level])
      .sort((a, b) => RANK[a.level] - RANK[b.level] || a.p.km - b.p.km)
      .slice(0, 3);
  }, [v, alts, nearby, day, leisure]);

  if (!day || !v) return null;
  const luck = luckTitle(v, `${placeName}|${day.date}|${leisure.id}`);

  // 판정 카드만 그림으로 떠서 클립보드에 넣는다 (카톡·블로그에 바로 붙여넣기)
  const capture = async () => {
    const el = ref.current;
    if (!el) return;
    trackShare("image_copy", "verdict");
    try {
      // 그림을 만드는 동안에도 "누른 직후"로 인정받게 Promise째 넘긴다 (사파리)
      await navigator.clipboard.write([new ClipboardItem({ "image/png": captureElement(el) })]);
      setToast("캡처가 복사되었습니다");
    } catch {
      setToast("복사하지 못했어요. 캡처해서 공유를 써 주세요");
    }
  };

  return (
    <section className="card verdict" ref={ref}>
      <div className="verdict-head">
        <h2>
          {leisure.emoji} {leisure.label} 가도 될까?
        </h2>
        {/* 캡처 그림에만 보인다 */}
        <span className="verdict-cap">
          {placeName} · {md(day.date)}({weekdayKo(day.date)})
        </span>
      </div>
      <div className="verdict-days" role="tablist" aria-label="날짜 고르기">
        {days.map((d) => {
          const w = weekday(d.date);
          return (
            <button
              key={d.date}
              role="tab"
              aria-selected={d.date === day?.date}
              className={`verdict-day${d.date === day?.date ? " on" : ""}${w === 6 ? " sat" : w === 0 ? " sun" : ""}`}
              onClick={() => setDate(d.date)}
            >
              {md(d.date)}
              <i>{weekdayKo(d.date)}</i>
            </button>
          );
        })}
      </div>
      <div className={`verdict-stamp ${v.level}`}>
        <div className="verdict-emoji" aria-hidden>
          {v.emoji}
        </div>
        <div>
          <b>{v.title}</b>
          <small>{v.sub}</small>
        </div>
      </div>
      <div className="verdict-chips">
        {v.chips.map((c) => (
          <span key={c.text} className={c.bad ? "bad" : undefined}>
            {c.text}
          </span>
        ))}
      </div>
      <p className="verdict-luck">
        이 날 잡은 사람: <b>{luck}</b>
      </p>
      {better && (
        <div className="verdict-alt">
          {better.length ? (
            <>
              <b>
                {md(day.date)}({weekdayKo(day.date)}) 가까운 곳은 이래요
              </b>
              <div className="verdict-alt-row">
                {better.map(({ p, level }) => (
                  <Link
                    key={p.slug}
                    href={`/weather/${p.slug}?act=${leisure.id}&vd=${day.date}`}
                    onClick={() => trackEvent("alt_place_click", { to: p.slug })}
                  >
                    {DOT[level]} {p.name} <small>{p.km}km</small>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <small>가까운 곳도 이 날은 비슷해요. 다른 날짜를 골라 보세요.</small>
          )}
        </div>
      )}
      <button className="verdict-share" onClick={capture}>
        📸 판정 캡처하기
      </button>
      <p className="verdict-note">비·바람·기온으로 매긴 판정이에요. 숫자를 꼭 같이 보세요.</p>
      <div className="verdict-cap verdict-mark">
        <span>{SLOGAN}</span>
        <b>tripnalc.com</b>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}
