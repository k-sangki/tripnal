import { describe, expect, it } from "vitest";
import data from "@/data/mountain-climate.json";
import { MOUNTAIN_INTRO } from "@/data/mountain-intro";
import { mountainClimateLine } from "./mountainClimate";

describe("mountainClimateLine", () => {
  it("명산마다 값이 있고 문장이 나온다", () => {
    for (const slug of Object.keys(MOUNTAIN_INTRO)) expect(mountainClimateLine(slug), slug).toMatch(/1월은 낮 -?\d+°/);
  });
  it("값이 그럴듯하다 (낮이 밤보다 따뜻, 8월이 1월보다 따뜻)", () => {
    for (const [slug, c] of Object.entries(data as Record<string, { hi: number[]; lo: number[] }>)) {
      c.hi.forEach((h, i) => expect(h, slug).toBeGreaterThan(c.lo[i]));
      expect(c.hi[7], slug).toBeGreaterThan(c.hi[0]);
    }
  });
});
