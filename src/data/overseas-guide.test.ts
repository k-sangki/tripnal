import { describe, expect, it } from "vitest";
import { getDestination } from "@/lib/overseas";
import { OVERSEAS_GUIDE } from "./overseas-guide";

describe("OVERSEAS_GUIDE", () => {
  it("모두 실제 해외 도시이고 글이 충분하다", () => {
    for (const [slug, g] of Object.entries(OVERSEAS_GUIDE)) {
      expect(getDestination(slug), slug).toBeTruthy();
      expect(g.land.length + g.climate.length, slug).toBeGreaterThan(150);
      expect(g.best.length, slug).toBeGreaterThan(3);
    }
  });
});
