/**
 * 새 버전 감지·적용 규칙 (SK 2026-11-11). 화면 쪽은 src/components/UpdateWatcher.tsx.
 * - 앱으로 돌아올 때: 새 버전이 있으면 그 자리에서 다시 불러온다 (스크롤 위치 유지).
 * - 보는 동안: 10분마다 확인, 새 버전이면 아래에 단추. 다음에 다른 페이지로 넘어갈 때 저절로 적용.
 * - 글을 쓰는 중이거나 창이 열려 있으면: 자동으로 다시 불러오지 않고 단추만.
 */

/** 이 화면의 버전 (빌드 때 next.config.ts가 넣는다) */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";

/** 보고 있는 동안 확인 간격 */
export const CHECK_EVERY_MS = 10 * 60e3;
/** 앱으로 돌아올 때 확인은 이 간격보다 자주 하지 않는다 (잠깐 껐다 켜기 반복) */
export const RESUME_MIN_GAP_MS = 30e3;

export const UPDATE_TEXT: Record<string, string> = {
  ko: "새 버전이 나왔어요 · 눌러서 적용",
  en: "New version available · Tap to update",
  ja: "新しいバージョンがあります · タップで更新",
  zh: "有新版本 · 點一下更新",
};

export function updateText(lang: string): string {
  return UPDATE_TEXT[lang.slice(0, 2)] ?? UPDATE_TEXT.ko;
}

/** 서버 버전이 이 화면과 다른지. 둘 중 하나라도 모르면 새 버전으로 보지 않는다 */
export function isNewer(server: string | null | undefined, mine: string = BUILD_ID): boolean {
  return !!server && !!mine && server !== mine;
}

/** 창(시트·팝업)이 열려 있는지 */
export function hasOpenDialog(doc: Document): boolean {
  return !!doc.querySelector('[aria-modal="true"], dialog[open]');
}

const TEXT_INPUT = /^(text|search|email|tel|url|number|password)$/;

/** 글을 쓰는 중인지: 입력칸에 커서가 있거나, 입력칸·글상자에 쓴 글이 남아 있다 */
export function isTyping(doc: Document): boolean {
  const a = doc.activeElement as HTMLElement | null;
  if (a) {
    if (a.isContentEditable || a.tagName === "TEXTAREA") return true;
    if (a.tagName === "INPUT" && TEXT_INPUT.test((a as HTMLInputElement).type)) return true;
  }
  for (const el of doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")) {
    if (el.tagName === "INPUT" && !TEXT_INPUT.test((el as HTMLInputElement).type)) continue;
    if (el.value.trim()) return true;
  }
  return false;
}

/** 자동으로 다시 불러오면 안 되는 상태 */
export function isBusy(doc: Document): boolean {
  return hasOpenDialog(doc) || isTyping(doc);
}

/**
 * 누른 링크가 사이트 안 다른 페이지로 넘어가는 보통 클릭인지 (그때 새 버전을 저절로 적용).
 * 새 탭·내려받기·같은 페이지 안 이동(#)은 건드리지 않는다.
 */
export function internalNavHref(
  e: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented">,
  a: { href: string; target: string; hasAttribute(n: string): boolean } | null,
  here: { origin: string; pathname: string; search: string },
): string | null {
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(a.href);
  } catch {
    return null;
  }
  if (url.origin !== here.origin) return null;
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return url.href;
}

const SCROLL_KEY = "tripnal:update-scroll";
const TRIED_KEY = "tripnal:update-tried";

/** 다시 불러온 뒤 같은 자리로 돌아오도록 지금 스크롤을 적어 둔다 */
export function saveScroll(storage: Storage, path: string, y: number): void {
  try {
    storage.setItem(SCROLL_KEY, JSON.stringify({ path, y, at: Date.now() }));
  } catch {}
}

/** 적어 둔 스크롤 (같은 페이지, 1분 안에 적은 것만). 한 번 읽으면 지운다 */
export function takeScroll(storage: Storage, path: string, now = Date.now()): number | null {
  try {
    const raw = storage.getItem(SCROLL_KEY);
    if (!raw) return null;
    storage.removeItem(SCROLL_KEY);
    const s = JSON.parse(raw) as { path?: string; y?: number; at?: number };
    if (s.path !== path || typeof s.y !== "number" || !s.at || now - s.at > 60e3) return null;
    return s.y;
  } catch {
    return null;
  }
}

/**
 * 같은 새 버전으로 이미 한 번 자동으로 다시 불러왔는지.
 * 배포가 퍼지는 동안 옛 화면이 또 오면 계속 다시 불러오지 않고 단추만 띄운다.
 */
export function alreadyTried(storage: Storage, server: string): boolean {
  try {
    return storage.getItem(TRIED_KEY) === server;
  } catch {
    return false;
  }
}

export function markTried(storage: Storage, server: string): void {
  try {
    storage.setItem(TRIED_KEY, server);
  } catch {}
}
