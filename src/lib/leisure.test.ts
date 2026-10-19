import { describe, expect, it } from "vitest";
import { BASE_METRICS, EXTRA_METRICS, GROUPS, LEISURES, TOP_METRICS, getLeisure } from "./leisure";

describe("activities", () => {
  it("모든 활동은 지표를 한 번씩만 보여주고, 기본 지표는 접지 않는다", () => {
    for (const l of LEISURES) {
      const all = [...l.rows, ...l.more];
      expect(new Set(all).size).toBe(all.length);
      expect(all.length).toBe(BASE_METRICS.length + EXTRA_METRICS.length);
      for (const k of BASE_METRICS) expect(l.rows).toContain(k);
    }
  });
  it("기온·체감이 맨 위, 그다음 그룹의 주 지표가 주어진 순서대로", () => {
    for (const g of GROUPS) {
      const l = LEISURES.find((x) => x.group === g.id)!;
      const primary = g.primary.filter((k) => !TOP_METRICS.includes(k));
      expect(l.rows.slice(0, 2)).toEqual(TOP_METRICS);
      expect(l.rows.slice(2, 2 + primary.length)).toEqual(primary);
    }
  });
  it("낚시는 파고·물때·풍랑이 기온·체감 바로 아래, 캠핑은 일교차", () => {
    expect(getLeisure("fishing").rows.slice(2, 5)).toEqual(["wave", "tide", "windWave"]);
    expect(getLeisure("camping").rows[2]).toBe("range");
    expect(getLeisure("camping").more).toContain("wave");
  });
  it("강수 확률은 따로 줄을 두지 않고, 구름은 사진·드라이브 등에서만 밖에 둔다", () => {
    for (const l of LEISURES) expect([...l.rows, ...l.more]).not.toContain("precipProb");
    expect(getLeisure("photo").rows).toContain("cloud");
    expect(getLeisure("camping").more[0]).toBe("cloud");
  });
  it("모르는 활동은 캠핑", () => {
    expect(getLeisure("x").id).toBe("camping");
  });
});
