"use client";

import { useEffect, useState } from "react";
import type { Warning } from "@/lib/warnings";

/** 그 장소에 내려진 기상특보·예비특보를 한 줄로 오른쪽에서 왼쪽으로 흘려 보여 준다. 없으면 아무것도 그리지 않는다 */
export function WarningTicker({ address }: { address?: string }) {
  // 다른 장소로 바뀌면 예전 장소의 특보는 보이지 않게 주소와 함께 둔다
  const [state, setState] = useState<{ address: string; warnings: Warning[] } | null>(null);

  useEffect(() => {
    if (!address) return;
    let alive = true;
    fetch(`/api/warnings?${new URLSearchParams({ address })}`)
      .then((r) => r.json() as Promise<{ warnings: Warning[] }>)
      .then((j) => alive && setState({ address, warnings: j.warnings ?? [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [address]);

  const warnings = state && state.address === address ? state.warnings : [];
  if (!warnings.length) return null;
  const text = warnings.map((w) => (w.kind === "pre" ? `예비 ${w.text}` : w.text)).join("   ·   ");
  return (
    <div className="warn-ticker" role="status" aria-label={`기상특보: ${text}`}>
      <span className="warn-badge">⚠️ 특보</span>
      <div className="warn-track" aria-hidden>
        <span className="warn-text" style={{ animationDuration: `${Math.max(10, text.length * 0.35)}s` }}>
          {text}
        </span>
      </div>
    </div>
  );
}
