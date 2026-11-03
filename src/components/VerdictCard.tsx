"use client";

import { useEffect, useMemo, useState } from "react";
import { loadKakaoShare, sendKakao } from "@/lib/kakaoShare";
import type { Leisure } from "@/lib/leisure";
import { weekday, weekdayKo } from "@/lib/time";
import { trackShare } from "@/lib/track";
import { stripUtm, withUtm } from "@/lib/utm";
import { dayVerdict, verdictDay } from "@/lib/verdict";
import type { DayForecast } from "@/lib/weather/types";

interface Props {
  days: DayForecast[];
  leisure: Leisure;
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
export function VerdictCard({ days, leisure, today, initialDate }: Props) {
  const [date, setDate] = useState(() => pickDefault(days, today, initialDate));
  const [kakao, setKakao] = useState<Awaited<ReturnType<typeof loadKakaoShare>> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    loadKakaoShare()
      .then((k) => !off && setKakao(k))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // 기간을 바꿔 고른 날이 빠지면 다시 고른다
  const day = days.find((d) => d.date === date) ?? days.find((d) => d.date === pickDefault(days, today, null));
  const v = useMemo(() => (day ? dayVerdict(verdictDay(day), leisure.id, leisure.group) : null), [day, leisure]);
  if (!day || !v) return null;

  const share = async () => {
    const u = new URL(stripUtm(window.location.href));
    u.searchParams.set("vd", day.date);
    if (kakao) {
      trackShare("kakao", "verdict");
      try {
        sendKakao(kakao, withUtm(u.toString(), "kakao"));
      } catch {
        setToast("카카오톡을 열지 못했어요");
      }
      return;
    }
    trackShare("link", "verdict");
    try {
      if (navigator.share) await navigator.share({ url: u.toString() });
      else {
        await navigator.clipboard.writeText(u.toString());
        setToast("링크를 복사했어요");
      }
    } catch {
      // 공유 창을 닫은 경우
    }
  };

  return (
    <section className="card verdict">
      <div className="verdict-head">
        <h2>
          {leisure.emoji} {leisure.label} 가도 될까?
        </h2>
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
      <button className="verdict-share" onClick={share}>
        💬 단톡방에 판정 보내기
      </button>
      <p className="verdict-note">비·바람·기온으로 매긴 판정이에요. 숫자를 꼭 같이 보세요.</p>
      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}
