import { describe, expect, it } from "vitest";
import { matchWarnings, parseAreas, placeRegion } from "./warnings";

const T6 = [
  "o 강풍주의보 : 강원도(강릉시평지, 동해시평지, 강원북부산지), 울릉도.독도",
  "o 건조주의보 : 경상북도(포항, 경주), 서울, 부산",
  "o 풍랑주의보 : 동해중부먼바다",
].join("\r\n");
const T7 = ["(1) 강풍 예비특보 : 10월 21일 새벽(00시~06시) : 제주도(제주도산지, 제주도북부)", "(2) 호우 예비특보 : 없음"].join("\r\n");

describe("기상특보", () => {
  it("주소에서 시·도 약칭과 시·군을 뽑는다", () => {
    expect(placeRegion("경북 포항시 남구 호미곶면")).toEqual({ province: "경북", city: "포항" });
    expect(placeRegion("강원특별자치도 강릉시 주문진읍")).toEqual({ province: "강원", city: "강릉" });
    expect(placeRegion("서울특별시 종로구 세종대로 1")).toEqual({ province: "서울", city: null });
    expect(placeRegion("가평 자라섬")).toBeNull();
  });

  it("괄호 안 구역을 나눈다", () => {
    expect(parseAreas("강원도(강릉시평지, 동해시평지), 울릉도.독도")).toEqual([
      { name: "강원도", subs: ["강릉시평지", "동해시평지"] },
      { name: "울릉도.독도", subs: [] },
    ]);
  });

  it("그 장소에 해당하는 특보만 고른다", () => {
    expect(matchWarnings(T6, T7, "강원 강릉시 주문진읍")).toEqual([{ kind: "now", text: "강풍주의보 발효 중" }]);
    expect(matchWarnings(T6, T7, "경북 포항시 북구")).toEqual([{ kind: "now", text: "건조주의보 발효 중" }]);
    // 시·도 전체에 내려진 특보
    expect(matchWarnings(T6, T7, "서울 마포구 상암동")).toEqual([{ kind: "now", text: "건조주의보 발효 중" }]);
    // 같은 도라도 목록에 없는 시·군은 아님
    expect(matchWarnings(T6, T7, "강원 춘천시 남산면")).toEqual([]);
    expect(matchWarnings(T6, T7, "경북 울릉군 울릉읍")).toEqual([{ kind: "now", text: "강풍주의보 발효 중" }]);
    expect(matchWarnings(T6, T7, "제주특별자치도 서귀포시 표선면")).toEqual([{ kind: "pre", text: "강풍 예비특보 (10월 21일 새벽(00시~06시))" }]);
  });
});
