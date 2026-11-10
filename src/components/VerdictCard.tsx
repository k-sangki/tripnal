"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SLOGAN } from "@/lib/brand";
import type { Leisure } from "@/lib/leisure";
import { weekday, weekdayKo } from "@/lib/time";
import { trackShare } from "@/lib/track";
import { dayVerdict, verdictDay } from "@/lib/verdict";
import type { DayForecast } from "@/lib/weather/types";
import { captureElement } from "./CaptureSheet";

interface Props {
  days: DayForecast[];
  leisure: Leisure;
  placeName: string;
  today: string;
  /** 공유 링크로 들어왔을 때 고를 날짜 (?vd=) */
  initialDate: string | null;
  /** 날짜를 직접 골랐을 때 (주소에 담아 공유 링크의 미리보기가 그날 판정이 되게) */
  onPick?: (date: string) => void;
}

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 처음 고를 날: 공유받은 날 → 다가오는 토요일 → 오늘 이후 첫날 */
function pickDefault(days: DayForecast[], today: string, initial: string | null): string | null {
  if (initial && days.some((d) => d.date === initial)) return initial;
  const ahead = days.filter((d) => d.date >= today);
  return (ahead.find((d) => weekday(d.date) === 6) ?? ahead[0] ?? days[0])?.date ?? null;
}

/** "가도 될까?" 판정 카드 (예보표 위). 근거 숫자를 칩으로 같이 보여준다 */
export function VerdictCard({ days, leisure, placeName, today, initialDate, onPick }: Props) {
  const [date, setDate] = useState(() => pickDefault(days, today, initialDate));
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // 기간을 바꿔 고른 날이 빠지면 다시 고른다
  const day = days.find((d) => d.date === date) ?? days.find((d) => d.date === pickDefault(days, today, null));
  const v = useMemo(() => (day ? dayVerdict(verdictDay(day), leisure.id, leisure.group) : null), [day, leisure]);
  if (!day || !v) return null;

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
              onClick={() => {
                setDate(d.date);
                onPick?.(d.date);
              }}
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
