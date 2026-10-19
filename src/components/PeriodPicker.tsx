"use client";

import { useState } from "react";
import { PRESETS, lastDay, matchPreset, presetPeriod, type Period } from "@/lib/period";

export function PeriodPicker({ value, today, onChange }: { value: Period; today: string; onChange: (p: Period) => void }) {
  const active = matchPreset(value, today);
  const [custom, setCustom] = useState(active == null);
  const max = lastDay(today);

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
        <div className="date-row">
          <input
            type="date"
            aria-label="시작일"
            min={today}
            max={max}
            value={value.from}
            onChange={(e) => e.target.value && onChange({ from: e.target.value, to: value.to < e.target.value ? e.target.value : value.to })}
          />
          <span className="muted">~</span>
          <input
            type="date"
            aria-label="종료일"
            min={value.from}
            max={max}
            value={value.to}
            onChange={(e) => e.target.value && onChange({ from: value.from, to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
