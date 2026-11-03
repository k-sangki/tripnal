import { describe, expect, it } from "vitest";
import { stripUtm, withUtm } from "./utm";

describe("utm", () => {
  it("공유 주소에서 utm만 뗀다", () => {
    expect(stripUtm("https://tripnalc.com/?lat=37&utm_source=share&utm_medium=shortlink&act=camp")).toBe("https://tripnalc.com/?lat=37&act=camp");
  });
  it("유입 표시를 붙이고 이미 있으면 바꾼다", () => {
    expect(withUtm("https://tripnalc.com/weather/x?int=3h", "kakao")).toBe("https://tripnalc.com/weather/x?int=3h&utm_source=kakao&utm_medium=share");
    expect(withUtm("https://tripnalc.com/?utm_source=a", "share", "shortlink")).toBe("https://tripnalc.com/?utm_source=share&utm_medium=shortlink");
  });
});
