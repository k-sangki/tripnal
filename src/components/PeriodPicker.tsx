"use client";

import { useState } from "react";
import { MAX_DAYS, PRESETS, matchPreset, presetPeriod, type Period } from "@/lib/period";
import { addDays, weekday, weekdayKo } from "@/lib/time";

/**
 * 기간 선택. 직접 선택은 달력 대신 오늘부터 16일을 버튼으로 늘어놓고
 * 시작일 → 종료일 순서로 누른다.
 */
export function PeriodPicker({ value, today, onChange }: { value: Period; today: string; onChange: (p: Period) => void }) {
  const active = matchPreset(value, today);
  const [custom, setCustom] = useState(active == null);
  // 시작일만 고른 상태
  const [anchor, setAnchor] = useState<string | null>(null);
  const dates = Array.from({ length: MAX_DAYS }, (_, i) => addDays(today, i));

  function pick(d: string) {
    if (anchor == null || d < anchor) {
      setAnchor(d);
      onChange({ from: d, to: d });
    } else {
      setAnchor(null);
      onChange({ from: anchor, to: d });
    }
  }

  return (
    <div>
      <div className="chips" role="group" aria-label="기간 선택">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className="chip"
            aria-pressed={!custom && active === p.id}
            onClick={() => {
              setCustom(false);
              setAnchor(null);
              onChange(presetPeriod(p.id, today));
            }}
          >
            {p.label}
          </button>
        ))}
        <button className="chip" aria-pressed={custom} onClick={() => setCustom(true)}>
          직접 선택
        </button>
      </div>
      {custom && (
        <div className="day-pick">
          <p className="muted">{anchor ? "끝나는 날을 누르세요" : "시작하는 날과 끝나는 날을 차례로 누르세요"}</p>
          <div className="day-grid" role="group" aria-label="날짜 선택">
            {dates.map((d) => {
              const w = weekday(d);
              const edge = d === value.from || d === value.to;
              const inside = d > value.from && d < value.to;
              return (
                <button
                  key={d}
                  className={[edge && "edge", inside && "in", w === 6 && "d-sat", w === 0 && "d-sun"].filter(Boolean).join(" ")}
                  aria-pressed={edge || inside}
                  onClick={() => pick(d)}
                >
                  <b>{d === today ? "오늘" : d.endsWith("-01") ? `${Number(d.slice(5, 7))}/1` : Number(d.slice(8))}</b>
                  <small>{weekdayKo(d)}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
