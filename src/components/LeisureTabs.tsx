"use client";

import { Fragment } from "react";
import { GROUPS, LEISURES, getLeisure, type LeisureId } from "@/lib/leisure";

/**
 * 활동 그룹 선택. 같은 그룹의 활동은 같은 지표를 보여주므로 그룹 단위로 고른다.
 * 그룹을 누르면 그 그룹의 첫 활동이 선택된다 (주소의 act 값).
 */
export function LeisureTabs({ value, onChange }: { value: LeisureId; onChange: (id: LeisureId) => void }) {
  const current = getLeisure(value).group;
  return (
    <div className="grp-list" role="group" aria-label="활동 선택">
      {GROUPS.map((g) => {
        const first = LEISURES.find((l) => l.group === g.id)!;
        const on = g.id === current;
        return (
          <button key={g.id} className="grp-btn" aria-pressed={on} onClick={() => !on && onChange(first.id)}>
            <span className="grp-emoji" aria-hidden>
              {first.emoji}
            </span>
            <span className="grp-label">
              {first.groupItems.map((t, i, all) => (
                <Fragment key={t}>
                  <span>
                    {t}
                    {i < all.length - 1 && (
                      <i className="grp-dot" aria-hidden>
                        ·
                      </i>
                    )}
                  </span>{" "}
                </Fragment>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
