/**
 * 물때. 음력 날짜로 정해지며, 서해에서 흔히 쓰는 7물때식을 따른다.
 * 음력 1·16일이 7물, 8·23일이 조금, 9·24일이 무시, 10·25일이 1물.
 * 음력 날짜는 한국 시각(KST)으로 그 날에 든 삭(신월) 시각에서 센다.
 */

const SYNODIC = 29.530588861;
const RAD = Math.PI / 180;

/** k번째 삭의 시각 (율리우스일, 지구시). Meeus 49장의 주요 보정항만 쓴다 (오차 수 분) */
function newMoonJde(k: number): number {
  const T = k / 1236.85;
  const jde = 2451550.09766 + SYNODIC * k + 0.00015437 * T * T;
  const E = 1 - 0.002516 * T;
  const M = (2.5534 + 29.1053567 * k) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * RAD;
  const corr =
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(O);
  return jde + corr;
}

/** 율리우스일 → KST 날짜의 일련번호 (1970-01-01 = 0) */
function kstDayNumber(jd: number): number {
  const ms = (jd - 2440587.5) * 86400e3 - 69e3 + 9 * 3600e3; // 지구시−세계시 약 69초
  return Math.floor(ms / 86400e3);
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400e3);
}

/** 음력 날짜 (1~30). date는 YYYY-MM-DD (KST) */
export function lunarDay(date: string): number {
  const n = dayNumber(date);
  const jd = n + 2440587.5;
  let k = Math.floor((jd - 2451550.09766) / SYNODIC) + 1;
  while (kstDayNumber(newMoonJde(k)) > n) k--;
  return n - kstDayNumber(newMoonJde(k)) + 1;
}

const NAMES = ["7물", "8물", "9물", "10물", "11물", "12물", "13물", "조금", "무시", "1물", "2물", "3물", "4물", "5물", "6물"];

export function muldae(date: string): string {
  return NAMES[(lunarDay(date) - 1) % 15];
}
