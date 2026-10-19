import { describe, expect, it } from "vitest";
import { BASE_METRICS, EXTRA_METRICS, GROUPS, LEISURES, getLeisure } from "./leisure";

describe("activities", () => {
  it("모든 활동은 지표를 한 번씩만 보여주고, 기본 지표는 접지 않는다", () => {
    for (const l of LEISURES) {
      const all = [...l.rows, ...l.more];
      expect(new Set(all).size).toBe(all.length);
      expect(all.length).toBe(BASE_METRICS.length + EXTRA_METRICS.length);
      for (const k of BASE_METRICS) expect(l.rows).toContain(k);
    }
  });
  it("그룹의 주 지표가 주어진 순서대로 맨 위에 온다", () => {
    for (const g of GROUPS) {
      const l = LEISURES.find((x) => x.group === g.id)!;
      expect(l.rows.slice(0, g.primary.length)).toEqual(g.primary);
    }
  });
  it("낚시는 파고·조석·풍랑이 위로, 캠핑은 일교차가 맨 위", () => {
    expect(getLeisure("fishing").rows.slice(0, 3)).toEqual(["wave", "tide", "windWave"]);
    expect(getLeisure("camping").rows[0]).toBe("range");
    expect(getLeisure("camping").more).toContain("wave");
  });
  it("강수확률은 강수 바로 아래", () => {
    for (const l of LEISURES) expect(l.rows[l.rows.indexOf("precip") + 1]).toBe("precipProb");
  });
  it("모르는 활동은 캠핑", () => {
    expect(getLeisure("x").id).toBe("camping");
  });
});
