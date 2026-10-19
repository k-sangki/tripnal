import { describe, expect, it } from "vitest";
import { aggregate, sunTimes } from "./aggregate";
import { mockRaw } from "./mock";
import { blendModels, buildOpenMeteoUrl, parseOpenMeteo } from "./openMeteo";
import type { RawForecast } from "./types";

function raw(hours: number, over: Partial<RawForecast["hourly"]> = {}): RawForecast {
  const time = Array.from({ length: hours }, (_, i) => {
    const d = 19 + Math.floor(i / 24);
    const h = i % 24;
    return `2026-10-${d}T${h < 10 ? "0" : ""}${h}:00`;
  });
  const fill = (v: number) => Array(hours).fill(v);
  return {
    latitude: 37.82,
    longitude: 127.52,
    elevation: 50,
    source: "test",
    hourly: {
      time,
      temperature: time.map((_, i) => i % 24),
      apparentTemperature: fill(1),
      precipitation: fill(0),
      precipitationProbability: fill(10),
      cloudCover: fill(30),
      windSpeed: fill(2),
      windGusts: fill(3),
      windDirection: fill(270),
      weatherCode: fill(1),
      ...over,
    },
  };
}

describe("aggregate", () => {
  it("시간 단위를 하루 8칸(3시간)으로 묶는다", () => {
    const f = aggregate(raw(48));
    expect(f.days).toHaveLength(2);
    expect(f.days[0].slots.map((s) => s.hour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    expect(f.elevation).toBe(50);
  });

  it("강수는 3시간 합, 돌풍·날씨코드는 3시간 최대", () => {
    const r = raw(24);
    r.hourly.precipitation[3] = 1.2;
    r.hourly.precipitation[4] = 0.5;
    r.hourly.windGusts[5] = 12;
    r.hourly.weatherCode[4] = 63;
    const slot = aggregate(r).days[0].slots[1];
    expect(slot.precip).toBe(1.7);
    expect(slot.gust).toBe(12);
    expect(slot.code).toBe(63);
  });

  it("일 최저·최고는 시간 단위 전체에서 구한다", () => {
    const d = aggregate(raw(24)).days[0];
    expect(d.tMin).toBe(0);
    expect(d.tMax).toBe(23);
  });

  it("null 값이 있어도 깨지지 않는다", () => {
    const r = raw(24, { temperature: Array(24).fill(null), precipitationProbability: Array(24).fill(null) });
    const d = aggregate(r).days[0];
    expect(d.tMin).toBeNull();
    expect(d.slots[0].temp).toBeNull();
    expect(d.precipProbMax).toBeNull();
  });

  it("mock 예보는 16일치를 만든다", () => {
    expect(aggregate(mockRaw(37.5, 127)).days).toHaveLength(16);
  });
});

describe("sunTimes", () => {
  it("서울 10월 일출·일몰이 상식적인 범위", () => {
    const { sunrise, sunset } = sunTimes("2026-10-19", 37.5665, 126.978);
    expect(sunrise! >= "06:30" && sunrise! <= "07:00").toBe(true);
    expect(sunset! >= "17:40" && sunset! <= "18:10").toBe(true);
  });
});

describe("openMeteo", () => {
  it("URL에 16일·한국시간·m/s 와 고도를 넣는다", () => {
    const u = new URL(buildOpenMeteoUrl(38.1192, 128.4655, undefined, 1708));
    expect(u.host).toBe("api.open-meteo.com");
    expect(u.searchParams.get("forecast_days")).toBe("16");
    expect(u.searchParams.get("timezone")).toBe("Asia/Seoul");
    expect(u.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(u.searchParams.get("elevation")).toBe("1708");
  });

  it("유료 키가 있으면 customer 호스트를 쓴다", () => {
    expect(new URL(buildOpenMeteoUrl(37, 127, "k")).host).toBe("customer-api.open-meteo.com");
  });

  it("응답을 공통 형식으로 바꾼다", () => {
    const r = parseOpenMeteo({
      latitude: 37.5,
      longitude: 127,
      elevation: 38,
      hourly: {
        time: ["2026-10-19T00:00"],
        temperature_2m: [10.2],
        apparent_temperature: [8.1],
        precipitation: [0],
        precipitation_probability: [5],
        cloud_cover: [20],
        wind_speed_10m: [3.1],
        wind_gusts_10m: [6.2],
        wind_direction_10m: [300],
        weather_code: [1],
      },
    });
    expect(r.elevation).toBe(38);
    expect(r.hourly.windGusts).toEqual([6.2]);
  });

  it("기상청 → ECMWF → 기본 순서로 시각마다 값을 고르고, 사흘 뒤부터는 ECMWF를 먼저 쓴다", () => {
    const n = 100;
    const t0 = Date.UTC(2020, 0, 1); // 과거 시각이라 처음부터 센다
    const time = Array.from({ length: n }, (_, i) => new Date(t0 + i * 3600e3).toISOString().slice(0, 16));
    const fill = (v: number | null) => Array.from({ length: n }, () => v);
    const kma = fill(1);
    kma[1] = null;
    const r = blendModels({
      latitude: 37,
      longitude: 127,
      hourly: {
        time,
        temperature_2m_kma_seamless: kma,
        temperature_2m_ecmwf_ifs: fill(2),
        temperature_2m_best_match: fill(3),
        precipitation_probability_kma_seamless: fill(null),
        precipitation_probability_ecmwf_ifs: fill(null),
        precipitation_probability_best_match: fill(40),
      } as never,
    });
    const temp = r.hourly.temperature_2m!;
    expect([temp[0], temp[1], temp[71], temp[72]]).toEqual([1, 2, 1, 2]);
    expect(r.hourly.precipitation_probability![80]).toBe(40);
  });

  it("모델 목록을 URL에 넣는다", () => {
    expect(new URL(buildOpenMeteoUrl(37, 127, undefined, undefined, ["kma_seamless", "ecmwf_ifs", "best_match"])).searchParams.get("models")).toBe(
      "kma_seamless,ecmwf_ifs,best_match",
    );
  });
});
