"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type ShareMethod = "kakao" | "image" | "save" | "link" | "copy" | "naver";

/**
 * 공유 버튼 누름을 GA4 추천 이벤트 share 로 남긴다.
 * ?me=1 로 연 브라우저는 ga-disable 이라 gtag가 아무것도 보내지 않는다.
 */
export function trackShare(method: ShareMethod, contentType: string) {
  try {
    window.gtag?.("event", "share", { method, content_type: contentType, item_id: location.pathname });
  } catch {
    // 통계가 막혀 있어도 공유는 그대로
  }
}
