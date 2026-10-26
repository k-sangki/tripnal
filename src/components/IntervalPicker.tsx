"use client";

import { INTERVALS, type Interval } from "@/lib/interval";
import { useT } from "./LocaleContext";

export function IntervalPicker({ value, onChange }: { value: Interval; onChange: (i: Interval) => void }) {
  const t = useT();
  return (
    <div className="seg" role="group" aria-label={t("예보 간격")}>
      {INTERVALS.map((i) => (
        <button key={i.id} aria-pressed={i.id === value} onClick={() => onChange(i.id)} title={t(i.long)}>
          {t(i.label)}
        </button>
      ))}
    </div>
  );
}
