import { describe, expect, it } from "vitest";
import { alreadyTried, internalNavHref, isNewer, markTried, saveScroll, takeScroll, updateText } from "./appVersion";

function mem(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const loc = { origin: "https://tripnalc.com", pathname: "/weather/seoul", search: "" };
const a = (href: string, target = "", download = false) => ({ href, target, hasAttribute: (n: string) => n === "download" && download });

describe("appVersion", () => {
  it("버전이 다를 때만 새 버전", () => {
    expect(isNewer("b", "a")).toBe(true);
    expect(isNewer("a", "a")).toBe(false);
    expect(isNewer(null, "a")).toBe(false);
    expect(isNewer("b", "")).toBe(false);
  });

  it("사이트 안 다른 페이지로 가는 보통 클릭만 가로챈다", () => {
    expect(internalNavHref(click, a("https://tripnalc.com/weather/busan"), loc)).toBe("https://tripnalc.com/weather/busan");
    expect(internalNavHref(click, a("https://tripnalc.com/weather/seoul?d=3"), loc)).not.toBeNull();
    expect(internalNavHref(click, a("https://tripnalc.com/weather/seoul#map"), loc)).toBeNull();
    expect(internalNavHref(click, a("https://example.com/"), loc)).toBeNull();
    expect(internalNavHref(click, a("https://tripnalc.com/x", "_blank"), loc)).toBeNull();
    expect(internalNavHref(click, a("https://tripnalc.com/x", "", true), loc)).toBeNull();
    expect(internalNavHref({ ...click, metaKey: true }, a("https://tripnalc.com/x"), loc)).toBeNull();
    expect(internalNavHref({ ...click, defaultPrevented: true }, a("https://tripnalc.com/x"), loc)).toBeNull();
    expect(internalNavHref(click, null, loc)).toBeNull();
  });

  it("스크롤 위치는 같은 페이지에서 한 번만 돌려준다", () => {
    const s = mem();
    saveScroll(s, "/weather/seoul", 840);
    expect(takeScroll(s, "/weather/busan")).toBeNull();
    saveScroll(s, "/weather/seoul", 840);
    expect(takeScroll(s, "/weather/seoul")).toBe(840);
    expect(takeScroll(s, "/weather/seoul")).toBeNull();
    saveScroll(s, "/weather/seoul", 840);
    expect(takeScroll(s, "/weather/seoul", Date.now() + 120e3)).toBeNull();
  });

  it("같은 새 버전으로는 한 번만 자동 적용", () => {
    const s = mem();
    expect(alreadyTried(s, "v2")).toBe(false);
    markTried(s, "v2");
    expect(alreadyTried(s, "v2")).toBe(true);
    expect(alreadyTried(s, "v3")).toBe(false);
  });

  it("언어별 단추 문구", () => {
    expect(updateText("ko")).toBe("새 버전이 나왔어요 · 눌러서 적용");
    expect(updateText("zh-Hant")).toBe("有新版本 · 點一下更新");
  });
});
