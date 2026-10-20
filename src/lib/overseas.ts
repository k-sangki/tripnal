import data from "@/data/overseas.json";
import { tzOffsetMin } from "@/lib/time";

/**
 * 해외 여행지 날씨 페이지(/overseas/{slug}) 목록.
 * 같은 목록(src/data/overseas.json)을 수집기(collector/overseas.py)가 읽어 이 지점들의 격자만 따로 받는다.
 * 그래서 해외는 아무 좌표나 볼 수 없고 이 목록의 장소만 볼 수 있다.
 */
export interface Destination {
  slug: string;
  name: string;
  country: string;
  /** 목록 화면의 묶음 (일본, 동남아 등) */
  group: string;
  lat: number;
  lon: number;
  /** IANA 시간대. 날짜·시각은 현지 시간으로 보여 준다 */
  tz: string;
  /** 기온 보정에 쓰는 도시 고도(m) */
  elevation: number;
  aliases?: string[];
}

export const DESTINATIONS: Destination[] = data;

export const DESTINATION_GROUPS = [...new Set(DESTINATIONS.map((d) => d.group))];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

/** 좌표가 목록의 여행지인지 (예보 API가 해외 좌표를 받을 때) */
export function findDestination(lat: number, lon: number): Destination | undefined {
  return DESTINATIONS.find((d) => Math.abs(d.lat - lat) < 0.002 && Math.abs(d.lon - lon) < 0.002);
}

/** 여행지의 지금 현지 시간대(UTC와의 차이, 분) */
export function destinationOffset(d: Destination, now: Date = new Date()): number {
  return tzOffsetMin(d.tz, now);
}
