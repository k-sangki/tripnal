import { tr, type Locale } from "@/lib/i18n";
import { METRIC, tempDiffIn, windIn, type Units } from "@/lib/units";
import type { ForecastChange } from "@/lib/weather/types";

/**
 * 지난 예보 대비 변화 중 가장 눈에 띄는 하나를 짧게.
 * 비가 새로 생기거나 사라진 것 > 강수량 차이 > 바람 차이 > 기온 차이 순서이고, 작은 차이는 "비슷"으로 둔다.
 * 나빠지는 쪽만이 아니라 좋아지는 쪽(비 사라짐, 바람 약해짐)도 같은 무게로 알린다.
 */
export function changeText(c: ForecastChange | null | undefined, l: Locale = "ko", u: Units = METRIC): { text: string; cls: string } | null {
  if (!c) return null;
  const t = (ko: string) => tr(l, ko);
  const now = c.precipBefore + c.precip;
  if (c.precipBefore < 1 && now >= 3) return { text: t("비 생김"), cls: "chg-wet" };
  if (c.precipBefore >= 3 && now < 1) return { text: t("비 사라짐"), cls: "chg-dry" };
  if (Math.abs(c.precip) >= 5) {
    return c.precip > 0 ? { text: `${t("비")} +${Math.round(c.precip)}mm`, cls: "chg-wet" } : { text: `${t("비")} −${Math.round(-c.precip)}mm`, cls: "chg-dry" };
  }
  if (c.wind != null && Math.abs(c.wind) >= 2) {
    const before = Math.round(windIn(c.windBefore ?? 0, u));
    const after = Math.round(windIn((c.windBefore ?? 0) + c.wind, u));
    return c.wind > 0
      ? { text: `${t("바람 강해짐")} ${before}→${after}`, cls: "chg-windy" }
      : { text: `${t("바람 약해짐")} ${before}→${after}`, cls: "chg-calm" };
  }
  const [name, d]: [string, number] = Math.abs(c.tMax) >= Math.abs(c.tMin) ? ["최고", c.tMax] : ["최저", c.tMin];
  if (Math.abs(d) >= 2) {
    const v = Math.round(Math.abs(tempDiffIn(d, u)));
    return d > 0 ? { text: `${t(name)} +${v}°`, cls: "chg-warm" } : { text: `${t(name)} −${v}°`, cls: "chg-cold" };
  }
  return { text: t("비슷"), cls: "chg-same" };
}
