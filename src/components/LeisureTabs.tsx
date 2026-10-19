"use client";

import { GROUPS, LEISURES, type LeisureId } from "@/lib/leisure";

/** 활동 선택. 같은 기상 지표를 보는 활동끼리 한 줄로 묶는다 (그룹 이름은 표시하지 않음) */
export function LeisureTabs({ value, onChange }: { value: LeisureId; onChange: (id: LeisureId) => void }) {
  return (
    <div className="act-groups" role="group" aria-label="활동 선택">
      {GROUPS.map((g) => (
        <div key={g.id} className="chips act-row">
          {LEISURES.filter((l) => l.group === g.id).map((l) => (
            <button key={l.id} className="chip sm" aria-pressed={l.id === value} onClick={() => onChange(l.id)}>
              {l.emoji} {l.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
