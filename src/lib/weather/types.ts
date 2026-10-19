/** 시간 단위 원시 예보. 모든 provider가 이 형태로 돌려주면 나머지 로직은 그대로 쓴다. */
export interface HourlySeries {
  /** "YYYY-MM-DDTHH:00" (한국 시간) */
  time: string[];
  temperature: (number | null)[];
  apparentTemperature: (number | null)[];
  /** mm/h */
  precipitation: (number | null)[];
  /** % */
  precipitationProbability: (number | null)[];
  /** % */
  cloudCover: (number | null)[];
  /** m/s, 10m */
  windSpeed: (number | null)[];
  /** m/s */
  windGusts: (number | null)[];
  /** 바람이 불어오는 방향, 도 */
  windDirection: (number | null)[];
  /** WMO weather code */
  weatherCode: (number | null)[];
}

export interface RawForecast {
  latitude: number;
  longitude: number;
  /** 기온 보정에 사용된 지점 고도(m) */
  elevation: number | null;
  hourly: HourlySeries;
  source: string;
}

export interface WeatherProvider {
  name: string;
  /** elevation: 산 정상 등 기온 보정에 쓸 고도(m). 없으면 지형 자료 값 */
  fetchHourly(lat: number, lon: number, elevation?: number): Promise<RawForecast>;
}

/** 3시간 묶음 한 칸 */
export interface Slot {
  /** "YYYY-MM-DDTHH:00" 시작 시각 */
  time: string;
  hour: number;
  temp: number | null;
  feels: number | null;
  /** 3시간 누적 강수 mm */
  precip: number | null;
  precipProb: number | null;
  cloud: number | null;
  wind: number | null;
  /** 3시간 중 최대 돌풍 */
  gust: number | null;
  windDir: number | null;
  code: number | null;
  isDay: boolean;
}

export interface DayForecast {
  /** "YYYY-MM-DD" */
  date: string;
  slots: Slot[];
  tMin: number | null;
  tMax: number | null;
  precipSum: number;
  precipProbMax: number | null;
  windMax: number | null;
  gustMax: number | null;
  /** 낮 시간 대표 날씨 코드 */
  code: number | null;
  /** "HH:MM" */
  sunrise: string | null;
  sunset: string | null;
}

export interface Forecast {
  latitude: number;
  longitude: number;
  elevation: number | null;
  source: string;
  /** ISO, 생성 시각 */
  generatedAt: string;
  days: DayForecast[];
}
