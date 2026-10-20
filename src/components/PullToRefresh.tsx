"use client";

import { useEffect, useState } from "react";

/** 이만큼(px) 당겼다 놓으면 새로고침 */
const TRIGGER = 70;

/**
 * 맨 위에서 아래로 당겼다 놓으면 새로고침.
 * 브라우저 탭은 자체 당겨서 새로고침이 있으므로, 홈 화면에 추가한 앱(standalone)에서만 켠다.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    let start: number | null = null;
    let dist = 0;
    const onStart = (e: TouchEvent) => {
      start = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
      dist = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (start == null) return;
      const dy = e.touches[0].clientY - start;
      if (dy <= 0 || window.scrollY > 0) {
        dist = 0;
        setPull(0);
        return;
      }
      // 당길수록 덜 따라오게
      dist = Math.min(dy * 0.5, TRIGGER * 1.5);
      setPull(dist);
    };
    const onEnd = () => {
      if (start != null && dist >= TRIGGER) {
        setLoading(true);
        window.location.reload();
      } else {
        setPull(0);
      }
      start = null;
      dist = 0;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (!pull && !loading) return null;
  const ready = loading || pull >= TRIGGER;
  return (
    <div className="ptr" style={{ transform: `translate(-50%, ${loading ? TRIGGER : pull}px)` }} aria-hidden>
      <span className={loading ? "spin" : undefined} style={loading ? undefined : { transform: `rotate(${pull * 4}deg)`, opacity: ready ? 1 : 0.5 }}>
        ↻
      </span>
    </div>
  );
}
