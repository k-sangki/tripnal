/** 한국 표준시(UTC+9, 서머타임 없음) 기준 날짜 유틸. 서버·브라우저 시간대와 무관하게 동작한다.
 * 해외 장소는 UTC와의 차이(분)를 넘겨 현지 시간으로 쓴다. */
export const KST_OFFSET_MIN = 540;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Date → 한국 시간(또는 offsetMin 현지 시간) 기준 "YYYY-MM-DD" */
export function kstDate(d: Date = new Date(), offsetMin = KST_OFFSET_MIN): string {
  const k = new Date(d.getTime() + offsetMin * 60e3);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

/** Date → 한국 시간(또는 offsetMin 현지 시간) 기준 "HH:MM" */
export function kstHourMinute(d: Date, offsetMin = KST_OFFSET_MIN): string {
  const k = new Date(d.getTime() + offsetMin * 60e3);
  return `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}

/** Date → 한국 시간(또는 offsetMin 현지 시간) 기준 "YYYY-MM-DDTHH:00" (정시 내림) */
export function kstHourKey(d: Date = new Date(), offsetMin = KST_OFFSET_MIN): string {
  const k = new Date(d.getTime() + offsetMin * 60e3);
  return `${kstDate(d, offsetMin)}T${pad(k.getUTCHours())}:00`;
}

/** "YYYY-MM-DD" 에 days 더하기 */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 두 날짜 사이 일수 (b - a) */
export function diffDays(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** 0=일 ... 6=토 */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayKo(date: string): string {
  return WEEKDAY_KO[weekday(date)];
}

/** "10/19(일)" */
export function shortDateKo(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}(${weekdayKo(date)})`;
}

/** "10월 19일 일요일" */
export function longDateKo(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 ${weekdayKo(date)}요일`;
}

/** 한국 시간(또는 offsetMin 현지 시간) 기준 그 날 정오의 Date (일출·일몰 계산용) */
export function kstNoon(date: string, offsetMin = KST_OFFSET_MIN): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12) - offsetMin * 60e3);
}

/** IANA 시간대(예: "Europe/Paris")의 그 시각 UTC와의 차이(분). 서머타임을 반영한다 */
export function tzOffsetMin(timeZone: string, d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(d);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  return Math.round((local - Math.floor(d.getTime() / 60e3) * 60e3) / 60e3);
}
