"use client";

import { LEISURES, type LeisureId } from "@/lib/leisure";

export function LeisureTabs({ value, onChange }: { value: LeisureId; onChange: (id: LeisureId) => void }) {
  return (
    <div className="chips" role="group" aria-label="레저 선택">
      {LEISURES.map((l) => (
        <button key={l.id} className="chip" aria-pressed={l.id === value} onClick={() => onChange(l.id)}>
          {l.emoji} {l.label}
        </button>
      ))}
    </div>
  );
}
