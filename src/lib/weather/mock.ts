import { addDays, kstDate } from "@/lib/time";
import type { RawForecast, WeatherProvider } from "./types";

/** 외부 API 없이 화면을 개발·테스트하기 위한 가짜 예보 (WEATHER_PROVIDER=mock). 값은 좌표와 시각으로 결정된다. */
export function mockRaw(lat: number, lon: number, now: Date = new Date(), elevation?: number): RawForecast {
  const start = kstDate(now);
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233)) * 1000;
  const rnd = (i: number) => {
    const x = Math.sin(seed + i * 1.618) * 43758.5453;
    return x - Math.floor(x);
  };
  const time: string[] = [];
  const temperature: number[] = [];
  const apparentTemperature: number[] = [];
  const precipitation: number[] = [];
  const precipitationProbability: number[] = [];
  const cloudCover: number[] = [];
  const windSpeed: number[] = [];
  const windGusts: number[] = [];
  const windDirection: number[] = [];
  const weatherCode: number[] = [];
  const snowfall: number[] = [];
  const visibility: number[] = [];
  const uvIndex: number[] = [];
  const cape: number[] = [];
  const waveHeight: number[] = [];
  const windWaveHeight: number[] = [];
  const seaLevel: number[] = [];
  const pm10: (number | null)[] = [];
  const pm25: (number | null)[] = [];

  for (let d = 0; d < 16; d++) {
    const date = addDays(start, d);
    const rainy = rnd(d * 31) > 0.7;
    const base = 14 - d * 0.3 + (rnd(d) - 0.5) * 4;
    for (let hr = 0; hr < 24; hr++) {
      const i = d * 24 + hr;
      time.push(`${date}T${hr < 10 ? "0" : ""}${hr}:00`);
      const t = base + 6 * Math.sin(((hr - 9) / 24) * 2 * Math.PI);
      const wind = 1.5 + rnd(i) * (rainy ? 8 : 4);
      const cloud = rainy ? 70 + rnd(i + 7) * 30 : rnd(d + 3) * 60;
      const rain = rainy && rnd(i + 11) > 0.5 ? Math.round(rnd(i + 13) * 40) / 10 : 0;
      temperature.push(Math.round(t * 10) / 10);
      apparentTemperature.push(Math.round((t - wind * 0.7) * 10) / 10);
      precipitation.push(rain);
      precipitationProbability.push(rainy ? Math.round(50 + rnd(i + 5) * 50) : Math.round(rnd(i + 5) * 20));
      cloudCover.push(Math.round(cloud));
      windSpeed.push(Math.round(wind * 10) / 10);
      windGusts.push(Math.round(wind * (1.4 + rnd(i + 17) * 0.6) * 10) / 10);
      windDirection.push(Math.round((200 + d * 20 + rnd(i) * 40) % 360));
      const cold = t < 1;
      snowfall.push(cold && rain > 0 ? Math.round(rain * 7) / 10 : 0);
      weatherCode.push(cold && rain > 0 ? 73 : rain > 2 ? 63 : rain > 0 ? 61 : cloud > 80 ? 3 : cloud > 40 ? 2 : cloud > 15 ? 1 : 0);
      visibility.push(Math.round((rain > 0 ? 3000 + rnd(i + 19) * 5000 : 12000 + rnd(i + 19) * 30000) / 100) * 100);
      const sunUp = hr >= 7 && hr <= 17;
      uvIndex.push(sunUp ? Math.round(Math.max(0, (6 - cloud / 25) * Math.sin(((hr - 6) / 12) * Math.PI)) * 10) / 10 : 0);
      cape.push(Math.round(rainy && hr > 11 && hr < 19 ? rnd(i + 23) * 1500 : rnd(i + 23) * 150));
      waveHeight.push(Math.round((0.3 + wind * 0.18 + rnd(i + 29) * 0.3) * 10) / 10);
      windWaveHeight.push(Math.round((wind * 0.12 + rnd(i + 31) * 0.2) * 10) / 10);
      // 반일주조: 약 12시간 25분 주기
      seaLevel.push(Math.round(1.6 * Math.sin(((i * 60 + d * 50) / 745) * 2 * Math.PI) * 100) / 100);
      pm10.push(d < 5 ? Math.round(15 + rnd(i + 37) * (rainy ? 25 : 90)) : null);
      pm25.push(d < 5 ? Math.round(6 + rnd(i + 41) * (rainy ? 12 : 45)) : null);
    }
  }

  return {
    latitude: lat,
    longitude: lon,
    elevation: elevation ?? Math.round(rnd(99) * 300),
    source: "mock",
    hourly: {
      time,
      temperature,
      apparentTemperature,
      precipitation,
      precipitationProbability,
      cloudCover,
      windSpeed,
      windGusts,
      windDirection,
      weatherCode,
      snowfall,
      visibility,
      uvIndex,
      cape,
      waveHeight,
      windWaveHeight,
      seaLevel,
      pm10,
      pm25,
    },
    // 지난 예보 대비 변화 (화면 확인용)
    change: Object.fromEntries(
      [...new Set(time.map((t) => t.slice(0, 10)))].slice(0, 15).map((d, k) => [d, { tMax: [0, 3, -1, 0, -2.5][k % 5], tMin: 0, precip: [0, 0, 8, -6, 0][k % 5], precipBefore: [0, 0, 0, 6, 0][k % 5] }]),
    ),
    // 날이 멀수록 낮아지는 예측 가능성 (화면 확인용)
    predictability: Object.fromEntries([...new Set(time.map((t) => t.slice(0, 10)))].map((d, k) => [d, Math.max(30, 90 - Math.floor(k / 2) * 10)])),
  };
}

export const mockProvider: WeatherProvider = {
  name: "mock",
  async fetchHourly(lat, lon, elevation) {
    return mockRaw(lat, lon, new Date(), elevation);
  },
};
