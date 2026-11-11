"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CHECK_EVERY_MS,
  RESUME_MIN_GAP_MS,
  alreadyTried,
  hasOpenDialog,
  internalNavHref,
  isBusy,
  isNewer,
  markTried,
  saveScroll,
  takeScroll,
  updateText,
} from "@/lib/appVersion";

/** 다시 불러온 뒤 내용(예보 표 등)이 늦게 그려져도 따라가며 스크롤을 맞추는 시간 */
const RESTORE_MS = 3000;

function here(): string {
  return window.location.pathname + window.location.search;
}

/** 지금 자리를 적어 두고 새 버전으로 다시 불러온다 */
function apply(server: string) {
  markTried(window.sessionStorage, server);
  saveScroll(window.sessionStorage, here(), window.scrollY);
  window.location.reload();
}

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const { v } = (await res.json()) as { v?: string };
    return v || null;
  } catch {
    return null;
  }
}

/** 다시 불러오기 전 스크롤 위치로 돌아간다. 사용자가 먼저 움직이면 멈춘다 */
function restoreScroll() {
  const y = takeScroll(window.sessionStorage, here());
  if (y == null || y <= 0) return;
  const until = Date.now() + RESTORE_MS;
  let stop = false;
  const cancel = () => (stop = true);
  const evs = ["touchstart", "wheel", "keydown", "mousedown"] as const;
  evs.forEach((ev) => window.addEventListener(ev, cancel, { passive: true, once: true }));
  const tick = () => {
    if (stop || Date.now() > until) {
      evs.forEach((ev) => window.removeEventListener(ev, cancel));
      return;
    }
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * 새 버전 감지·적용 (규칙은 src/lib/appVersion.ts).
 * 앱으로 돌아올 때는 그 자리에서 다시 불러오고, 보는 동안 알게 되면 단추를 띄운 뒤 다음 페이지 이동 때 적용한다.
 */
export function UpdateWatcher({ lang }: { lang: string }) {
  const [ready, setReady] = useState<string | null>(null);
  const readyRef = useRef<string | null>(null);
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  useEffect(() => {
    restoreScroll();
    let lastCheck = Date.now();
    let checking = false;

    const resumeApply = (v: string) => {
      if (!isBusy(document) && !alreadyTried(window.sessionStorage, v)) apply(v);
    };

    const check = async (resume: boolean) => {
      if (checking) return;
      checking = true;
      lastCheck = Date.now();
      const v = await fetchVersion();
      checking = false;
      if (!isNewer(v) || !v) return;
      readyRef.current = v;
      setReady(v);
      if (resume) resumeApply(v);
    };

    // 다른 앱·잠금 화면에서 돌아올 때
    const onResume = () => {
      if (document.visibilityState !== "visible") return;
      if (readyRef.current) return resumeApply(readyRef.current);
      if (Date.now() - lastCheck >= RESUME_MIN_GAP_MS) void check(true);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) onResume();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onPageShow);

    // 보고 있는 동안 10분마다 (가려진 탭에서는 확인하지 않는다)
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !readyRef.current && Date.now() - lastCheck >= CHECK_EVERY_MS) {
        void check(false);
      }
    }, 60e3);

    // 새 버전을 알고 있으면 다음 페이지 이동은 화면 안 이동 대신 새로 불러오기로
    const onClick = (e: MouseEvent) => {
      if (!readyRef.current) return;
      const a = (e.target as Element | null)?.closest?.("a") ?? null;
      const href = internalNavHref(e, a, window.location);
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      markTried(window.sessionStorage, readyRef.current);
      window.location.assign(href);
    };
    window.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(timer);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  // 링크가 아닌 이동(검색 결과 고르기 등)으로 페이지가 바뀌었으면 도착한 페이지를 새 버전으로
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    const v = readyRef.current;
    if (v && !hasOpenDialog(document)) {
      markTried(window.sessionStorage, v);
      window.location.reload();
    }
  }, [pathname]);

  if (!ready) return null;
  return (
    <button type="button" className="update-btn" onClick={() => apply(ready)}>
      {updateText(lang)}
    </button>
  );
}
