"use client";

import { useEffect, useRef, useState } from "react";
import { weekday, weekdayKo } from "@/lib/time";

/** 날짜별 카드를 좌우로 넘겨 보는 영역. 위쪽 날짜 탭으로도 이동한다. */
export function DaySwiper({ dates, today, children }: { dates: string[]; today: string; children: React.ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const key = dates.join(",");

  // 기간이 바뀌면 첫 카드로
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(0);
  }, [key]);

  // 선택된 날짜 탭이 보이도록
  useEffect(() => {
    const tab = tabs.current?.children[index] as HTMLElement | undefined;
    tab?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(Math.max(0, Math.min(dates.length - 1, i)));
  }

  function go(i: number) {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
    setIndex(i);
  }

  return (
    <div className="swiper">
      {dates.length > 1 && (
        <div className="swiper-bar">
          <button className="swiper-nav" aria-label="이전 날" disabled={index === 0} onClick={() => go(index - 1)}>
            ‹
          </button>
          <div className="date-tabs" ref={tabs} role="tablist" aria-label="날짜">
            {dates.map((d, i) => {
              const w = weekday(d);
              return (
                <button
                  key={d}
                  role="tab"
                  aria-selected={i === index}
                  className={w === 6 ? "d-sat" : w === 0 ? "d-sun" : undefined}
                  onClick={() => go(i)}
                >
                  <b>{d === today ? "오늘" : Number(d.slice(8))}</b>
                  <small>{weekdayKo(d)}</small>
                </button>
              );
            })}
          </div>
          <button className="swiper-nav" aria-label="다음 날" disabled={index === dates.length - 1} onClick={() => go(index + 1)}>
            ›
          </button>
        </div>
      )}
      <div className="swiper-track" ref={track} onScroll={onScroll}>
        {children}
      </div>
    </div>
  );
}
