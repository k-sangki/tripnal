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
  /** 신적설 cm/h */
  snowfall?: (number | null)[];
  /** 가시거리 m */
  visibility?: (number | null)[];
  uvIndex?: (number | null)[];
  /** 대기 불안정도(J/kg). 낙뢰 가능성 판단에 쓴다 */
  cape?: (number | null)[];
  /** 바다: 유의파고·풍랑(풍파) 높이 m, 해수면 높이(조석 포함) m */
  waveHeight?: (number | null)[];
  windWaveHeight?: (number | null)[];
  seaLevel?: (number | null)[];
  /** 대기질 µg/m³ (약 5일까지만 제공) */
  pm10?: (number | null)[];
  pm25?: (number | null)[];
}

export interface RawForecast {
  latitude: number;
  longitude: number;
  /** 기온 보정에 사용된 지점 고도(m) */
  elevation: number | null;
  hourly: HourlySeries;
  source: string;
  /** 관측소 예보 만조·간조. 있으면 해수면 자료에서 찾지 않고 이 시각을 쓴다 */
  tideEvents?: DatedTideEvent[];
  /** 날짜("YYYY-MM-DD")별 예측 가능성 % (모델·앙상블이 얼마나 비슷하게 내다보는지) */
  predictability?: Record<string, number>;
}

export interface DatedTideEvent {
  /** "YYYY-MM-DD HH:MM" (한국 시간) */
  at: string;
  type: "high" | "low";
  /** 평균 해수면 기준 m */
  level: number;
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
  /** 칸 동안 신적설 cm */
  snow: number | null;
  /** 칸 중 가장 짧은 가시거리 km */
  visibility: number | null;
  uv: number | null;
  cape: number | null;
  /** 칸 중 최대 파고·풍랑 m */
  wave: number | null;
  windWave: number | null;
  /** 칸 시작 시각 해수면 높이 m */
  tide: number | null;
  pm10: number | null;
  pm25: number | null;
}

export interface TideEvent {
  /** "HH:MM" */
  time: string;
  type: "high" | "low";
  /** 해수면 높이 m */
  level: number;
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
  /** 만조·간조 (해수면 자료가 있는 바다 근처만) */
  tides: TideEvent[];
  /** 예측 가능성 % (10 단위). 계산할 수 없는 provider는 null */
  predictability?: number | null;
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
