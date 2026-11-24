"use client";

import { GROUPS, LEISURES, getLeisure, type LeisureId } from "@/lib/leisure";

/**
 * 활동 그룹 선택. 같은 그룹의 활동은 같은 지표를 보여주므로 그룹 단위로 고른다.
 * 그룹을 누르면 그 그룹의 첫 활동이 선택된다 (주소의 act 값).
 * 버튼에는 대표 활동 하나만 쓰고, 같은 기준으로 보는 나머지 활동은 고른 그룹 아래 한 줄로만 보여준다
 * (모든 장소 페이지에 같은 활동 목록 30여 개가 붙지 않게, 2026-11-24).
 */
export function LeisureTabs({ value, onChange }: { value: LeisureId; onChange: (id: LeisureId) => void }) {
  const current = getLeisure(value).group;
  const picked = LEISURES.find((l) => l.group === current)!;
  return (
    <div>
      <div className="grp-grid" role="group" aria-label="활동 선택">
        {GROUPS.map((g) => {
          const first = LEISURES.find((l) => l.group === g.id)!;
          const on = g.id === current;
          return (
            <button key={g.id} className="grp-btn" aria-pressed={on} onClick={() => !on && onChange(first.id)}>
              <span className="grp-emoji" aria-hidden>
                {first.emoji}
              </span>
              <span className="grp-label">{first.groupItems[0]}</span>
            </button>
          );
        })}
      </div>
      {picked.groupItems.length > 1 && <p className="grp-also">{picked.groupItems.slice(1).join("·")}도 같은 기준으로 봐요.</p>}
    </div>
  );
}
