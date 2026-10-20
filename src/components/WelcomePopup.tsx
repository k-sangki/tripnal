"use client";

import { useEffect, useState } from "react";

/** "한 달간 보지 않기"를 누른 시각(ms)까지 숨긴다 */
const HIDE_KEY = "tripnal:welcome-hide-until";
/** "닫기"는 이번 방문(탭)에서만 숨긴다 */
const SESSION_KEY = "tripnal:welcome-closed";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function hidden(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return true;
    return Number(localStorage.getItem(HIDE_KEY) ?? 0) > Date.now();
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 매번 뜨지 않게 아예 보이지 않는다
    return true;
  }
}

/** 처음 온 사람에게 날씨 변화 알림 기능을 알려 주는 안내 */
export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hidden()) return;
    // 예보를 먼저 보여 주고 잠시 뒤에 띄운다
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  function close(month: boolean) {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
      if (month) localStorage.setItem(HIDE_KEY, String(Date.now() + MONTH_MS));
    } catch {}
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={() => close(false)} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="sheet welcome" onClick={(e) => e.stopPropagation()}>
        <div className="welcome-bell" aria-hidden>
          🔔
        </div>
        <h2 id="welcome-title">날씨가 바뀌면 알려 드려요</h2>
        <p>
          장소와 날짜를 고른 뒤 위쪽의 <b>🔔 날씨 바뀌면 알림</b>을 눌러 두세요. 비 예보가 새로 생기거나 사라질 때, 비의 양·바람·기온이 크게 바뀔 때
          휴대폰으로 알려 드립니다. 회원가입은 필요 없어요.
        </p>
        <p className="muted">아이폰은 Safari에서 &apos;홈 화면에 추가&apos;한 앱에서만 알림을 받을 수 있어요.</p>
        <div className="welcome-btns">
          <button className="share-btn" onClick={() => close(true)}>
            한 달간 보지 않기
          </button>
          <button className="share-btn primary" onClick={() => close(false)}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
