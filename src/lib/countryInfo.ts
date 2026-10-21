import type { Destination } from "@/lib/overseas";
import { tzOffsetMin } from "@/lib/time";

/**
 * 해외 도시 페이지 머리 카드의 여행 기본 정보 (시차·통화·플러그·비행시간).
 * 통화·플러그·전압은 나라별 표, 시차는 도시 시간대, 비행시간은 인천에서의 거리로 계산한 대략값.
 */
interface Country {
  /** 통화 이름 (코드) */
  currency: string;
  /** 콘센트 모양 (IEC 타입) */
  plugs: string;
  volt: number;
}

const C: Record<string, Country> = {
  일본: { currency: "엔(JPY)", plugs: "A·B", volt: 100 },
  중국: { currency: "위안(CNY)", plugs: "A·C·I", volt: 220 },
  홍콩: { currency: "홍콩달러(HKD)", plugs: "G", volt: 220 },
  마카오: { currency: "파타카(MOP)", plugs: "G", volt: 220 },
  대만: { currency: "대만달러(TWD)", plugs: "A·B", volt: 110 },
  몽골: { currency: "투그릭(MNT)", plugs: "C·E", volt: 230 },
  베트남: { currency: "동(VND)", plugs: "A·C", volt: 220 },
  태국: { currency: "바트(THB)", plugs: "A·B·C·O", volt: 220 },
  필리핀: { currency: "페소(PHP)", plugs: "A·B·C", volt: 220 },
  말레이시아: { currency: "링깃(MYR)", plugs: "G", volt: 240 },
  싱가포르: { currency: "싱가포르달러(SGD)", plugs: "G", volt: 230 },
  인도네시아: { currency: "루피아(IDR)", plugs: "C·F", volt: 230 },
  라오스: { currency: "킵(LAK)", plugs: "A·B·C·E·F", volt: 230 },
  캄보디아: { currency: "리엘(KHR)·미국달러", plugs: "A·C·G", volt: 230 },
  미얀마: { currency: "짯(MMK)", plugs: "C·D·F·G", volt: 230 },
  브루나이: { currency: "브루나이달러(BND)", plugs: "G", volt: 240 },
  인도: { currency: "루피(INR)", plugs: "C·D·M", volt: 230 },
  네팔: { currency: "네팔루피(NPR)", plugs: "C·D·M", volt: 230 },
  스리랑카: { currency: "스리랑카루피(LKR)", plugs: "D·G·M", volt: 230 },
  방글라데시: { currency: "타카(BDT)", plugs: "C·D·G·K", volt: 220 },
  몰디브: { currency: "루피야(MVR)", plugs: "C·D·G·J·K·L", volt: 230 },
  아랍에미리트: { currency: "디르함(AED)", plugs: "C·D·G", volt: 230 },
  카타르: { currency: "리얄(QAR)", plugs: "D·G", volt: 240 },
  우즈베키스탄: { currency: "숨(UZS)", plugs: "C·F", volt: 220 },
  카자흐스탄: { currency: "텡게(KZT)", plugs: "C·F", volt: 220 },
  키르기스스탄: { currency: "솜(KGS)", plugs: "C·F", volt: 220 },
  조지아: { currency: "라리(GEL)", plugs: "C·F", volt: 220 },
  튀르키예: { currency: "리라(TRY)", plugs: "C·F", volt: 230 },
  이집트: { currency: "이집트파운드(EGP)", plugs: "C·F", volt: 220 },
  에티오피아: { currency: "비르(ETB)", plugs: "C·F", volt: 220 },
  괌: { currency: "미국달러(USD)", plugs: "A·B", volt: 110 },
  사이판: { currency: "미국달러(USD)", plugs: "A·B", volt: 120 },
  호주: { currency: "호주달러(AUD)", plugs: "I", volt: 230 },
  뉴질랜드: { currency: "뉴질랜드달러(NZD)", plugs: "I", volt: 230 },
  영국: { currency: "파운드(GBP)", plugs: "G", volt: 230 },
  프랑스: { currency: "유로(EUR)", plugs: "C·E", volt: 230 },
  이탈리아: { currency: "유로(EUR)", plugs: "C·F·L", volt: 230 },
  독일: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  스페인: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  포르투갈: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  네덜란드: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  오스트리아: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  그리스: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  크로아티아: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  핀란드: { currency: "유로(EUR)", plugs: "C·F", volt: 230 },
  몰타: { currency: "유로(EUR)", plugs: "G", volt: 230 },
  스위스: { currency: "스위스프랑(CHF)", plugs: "C·J", volt: 230 },
  체코: { currency: "코루나(CZK)", plugs: "C·E", volt: 230 },
  헝가리: { currency: "포린트(HUF)", plugs: "C·F", volt: 230 },
  폴란드: { currency: "즐로티(PLN)", plugs: "C·E", volt: 230 },
  덴마크: { currency: "덴마크크로네(DKK)", plugs: "C·E·F·K", volt: 230 },
  아이슬란드: { currency: "아이슬란드크로나(ISK)", plugs: "C·F", volt: 230 },
  미국: { currency: "미국달러(USD)", plugs: "A·B", volt: 120 },
  캐나다: { currency: "캐나다달러(CAD)", plugs: "A·B", volt: 120 },
  멕시코: { currency: "멕시코페소(MXN)", plugs: "A·B", volt: 127 },
  페루: { currency: "솔(PEN)", plugs: "A·C", volt: 220 },
};

/** 한국 플러그(C·F)가 그대로 들어가는 콘센트 모양 */
const KOREAN_FIT = new Set(["C", "E", "F"]);

export interface TravelFacts {
  /** "한국보다 2시간 느림" */
  timeDiff: string;
  currency?: string;
  /** "A·B타입 100V · 어댑터 필요" */
  plug?: string;
  /** "인천에서 약 2시간" */
  flight: string;
}

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** 인천공항에서 거리로 어림한 비행시간 (순항 약 800km/h + 이착륙 30분). 직항이 없을 수 있다 */
export function flightHours(d: Pick<Destination, "lat" | "lon">): number {
  const h = km(37.46, 126.44, d.lat, d.lon) / 800 + 0.5;
  return Math.max(1, Math.round(h * 2) / 2);
}

export function plugText(c: Country): string {
  const types = c.plugs.split("·");
  const fit = types.filter((t) => KOREAN_FIT.has(t)).length;
  const note = fit === types.length ? "어댑터 없이 사용" : fit > 0 ? "멀티 어댑터 권장" : "어댑터 필요";
  return `${c.plugs}타입 ${c.volt}V · ${note}`;
}

export function travelFacts(d: Destination, now: Date = new Date()): TravelFacts {
  const diff = (tzOffsetMin(d.tz, now) - 540) / 60;
  const abs = Math.abs(diff);
  const hours = Number.isInteger(abs) ? `${abs}시간` : `${Math.floor(abs)}시간 30분`;
  const c = C[d.country];
  const h = flightHours(d);
  return {
    timeDiff: diff === 0 ? "한국과 시차 없음" : `한국보다 ${hours} ${diff < 0 ? "느림" : "빠름"}`,
    currency: c?.currency,
    plug: c ? plugText(c) : undefined,
    flight: `인천에서 비행 약 ${Number.isInteger(h) ? `${h}시간` : `${Math.floor(h)}시간 반`}`,
  };
}
