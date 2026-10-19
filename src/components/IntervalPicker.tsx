"use client";

import { INTERVALS, type Interval } from "@/lib/interval";

export function IntervalPicker({ value, onChange }: { value: Interval; onChange: (i: Interval) => void }) {
  return (
    <div className="seg" role="group" aria-label="예보 간격">
      {INTERVALS.map((i) => (
        <button key={i.id} aria-pressed={i.id === value} onClick={() => onChange(i.id)} title={i.long}>
          {i.label}
        </button>
      ))}
    </div>
  );
}
