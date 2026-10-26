"use client";

import { useState } from "react";
import { MAX_DAYS, PRESETS, matchPreset, presetPeriod, type Period } from "@/lib/period";
import { addDays, weekday, weekdayName } from "@/lib/time";
import { useLocale, useT } from "./LocaleContext";

/**
 * 기간 선택. 직접 선택은 달력 대신 오늘부터 16일을 버튼으로 늘어놓고
 * 시작일 → 종료일 순서로 누른다.
 */
export function PeriodPicker({ value, today, onChange }: { value: Period; today: string; onChange: (p: Period) => void }) {
  const { locale } = useLocale();
  const t = useT();
  const active = matchPreset(value, today);
  // 날짜 버튼(직접 선택)을 기본으로 펼쳐 둔다
  const [custom, setCustom] = useState(true);
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
      <div className="chips" role="group" aria-label={t("기간 선택")}>
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
            {t(p.label)}
          </button>
        ))}
        <button className="chip" aria-pressed={custom} onClick={() => setCustom(true)}>
          {t("직접 선택")}
        </button>
      </div>
      {custom && (
        <div className="day-pick">
          <p className="muted">{t(anchor ? "끝나는 날을 누르세요" : "시작하는 날과 끝나는 날을 차례로 누르세요")}</p>
          <div className="day-grid" role="group" aria-label={t("날짜 선택")}>
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
                  <b>{d === today ? t("오늘") : d.endsWith("-01") ? `${Number(d.slice(5, 7))}/1` : Number(d.slice(8))}</b>
                  <small>{weekdayName(d, locale)}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
