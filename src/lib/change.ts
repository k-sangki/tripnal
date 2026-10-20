import type { ForecastChange } from "@/lib/weather/types";

/**
 * 지난 예보 대비 변화 중 가장 눈에 띄는 하나를 짧게.
 * 비가 새로 생기거나 사라진 것 > 강수량 차이 > 기온 차이 순서이고, 작은 차이는 "비슷"으로 둔다.
 */
export function changeText(c: ForecastChange | null | undefined): { text: string; cls: string } | null {
  if (!c) return null;
  const now = c.precipBefore + c.precip;
  if (c.precipBefore < 1 && now >= 3) return { text: "비 생김", cls: "chg-wet" };
  if (c.precipBefore >= 3 && now < 1) return { text: "비 사라짐", cls: "chg-dry" };
  if (Math.abs(c.precip) >= 5) {
    return c.precip > 0 ? { text: `비 +${Math.round(c.precip)}mm`, cls: "chg-wet" } : { text: `비 −${Math.round(-c.precip)}mm`, cls: "chg-dry" };
  }
  const [name, d] = Math.abs(c.tMax) >= Math.abs(c.tMin) ? ["최고", c.tMax] : ["최저", c.tMin];
  if (Math.abs(d) >= 2) {
    const v = Math.round(Math.abs(d));
    return d > 0 ? { text: `${name} +${v}°`, cls: "chg-warm" } : { text: `${name} −${v}°`, cls: "chg-cold" };
  }
  return { text: "비슷", cls: "chg-same" };
}
