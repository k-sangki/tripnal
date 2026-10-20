/**
 * 기상청 기상특보 현황(공공데이터포털 "기상청_기상특보 조회서비스" getPwnStatus)을 읽어
 * 장소 주소에 해당하는 특보·예비특보만 고른다.
 *
 * t6(발효 중인 특보) 예: "o 강풍주의보 : 강원도(강릉시평지, 동해시평지), 울릉도.독도\r\no 풍랑주의보 : 동해중부먼바다"
 * t7(예비특보) 예: "(1) 강풍 예비특보 : 10월 21일 새벽(00시~06시) : 강원도(강릉시평지)"
 */

const API = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus";

/** 시·도 이름을 두 글자 약칭으로 (카카오 주소는 "경북", 기상청은 "경상북도"처럼 달라서) */
const PROVINCES: [RegExp, string][] = [
  [/^서울/, "서울"],
  [/^부산/, "부산"],
  [/^대구/, "대구"],
  [/^인천/, "인천"],
  [/^광주/, "광주"],
  [/^대전/, "대전"],
  [/^울산/, "울산"],
  [/^세종/, "세종"],
  [/^경기/, "경기"],
  [/^강원/, "강원"],
  [/^(충북|충청북)/, "충북"],
  [/^(충남|충청남)/, "충남"],
  [/^(전북|전라북)/, "전북"],
  [/^(전남|전라남)/, "전남"],
  [/^(경북|경상북)/, "경북"],
  [/^(경남|경상남)/, "경남"],
  [/^제주/, "제주"],
];

export function provinceKey(name: string): string | null {
  const n = name.trim();
  return PROVINCES.find(([re]) => re.test(n))?.[1] ?? null;
}

/** "경북 포항시 남구 ..." → { province: "경북", city: "포항" } */
export function placeRegion(address: string) {
  const [p, c] = address.trim().split(/\s+/);
  const province = p ? provinceKey(p) : null;
  if (!province) return null;
  // 세종처럼 시·군이 없는 곳은 시·도만
  const city = c && /(시|군)$/.test(c) ? c.replace(/(시|군)$/, "") : null;
  return { province, city };
}

/** "강원도(강릉시평지, 동해시평지), 울릉도.독도, 서울" → [{ name: "강원도", subs: [...] }, ...] */
export function parseAreas(text: string) {
  const out: { name: string; subs: string[] }[] = [];
  const re = /([^,()]+?)\s*(?:\(([^)]*)\))?\s*(?:,|$)/g;
  for (const m of text.matchAll(re)) {
    const name = m[1].trim();
    if (!name) continue;
    out.push({ name, subs: m[2] ? m[2].split(",").map((s) => s.trim()).filter(Boolean) : [] });
  }
  return out;
}

/** 그 지역 목록이 이 장소를 덮는지. 시·도만 있으면 전체, 괄호 안이 있으면 시·군 이름으로 맞춘다 */
export function covers(areas: ReturnType<typeof parseAreas>, region: { province: string; city: string | null }) {
  return areas.some((a) => {
    // 울릉도.독도처럼 시·도 없이 섬 이름만 오는 구역
    if (region.city && a.name.startsWith(region.city)) return true;
    if (provinceKey(a.name) !== region.province) return false;
    // 제주는 시가 아니라 산지·북부·남부 같은 권역으로 나눠서, 일부라도 걸리면 보여 준다
    if (!a.subs.length || region.province === "제주") return true;
    if (!region.city) return false;
    return a.subs.some((s) => s.startsWith(region.city!));
  });
}

export interface Warning {
  /** 화면에 그대로 보여 줄 한 줄 */
  text: string;
  /** 발효 중(now) 또는 예비특보(pre) */
  kind: "now" | "pre";
}

/** t6·t7 글에서 이 장소에 해당하는 줄만 뽑는다 */
export function matchWarnings(t6: string, t7: string, address: string): Warning[] {
  const region = placeRegion(address);
  if (!region) return [];
  const out: Warning[] = [];
  for (const line of t6.split(/\r?\n/)) {
    const m = line.match(/^\s*o\s*([^:]+?)\s*:\s*(.+)$/);
    if (m && covers(parseAreas(m[2]), region)) out.push({ kind: "now", text: `${m[1].trim()} 발효 중` });
  }
  for (const line of t7.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:\(\d+\))?\s*([^:]+?)\s*:\s*(.+?)\s*:\s*(.+)$/);
    if (!m || /없음/.test(line)) continue;
    if (covers(parseAreas(m[3]), region)) out.push({ kind: "pre", text: `${m[1].trim()} (${m[2].trim()})` });
  }
  return out;
}

/** 공공데이터포털에서 최신 특보 현황 t6·t7 */
export async function fetchStatus(key: string): Promise<{ t6: string; t7: string; tmFc: string } | null> {
  const q = new URLSearchParams({ serviceKey: key, dataType: "JSON", numOfRows: "10", pageNo: "1" });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(`특보 ${res.status}`);
  const json = (await res.json()) as {
    response?: { header?: { resultCode?: string }; body?: { items?: { item?: { t6?: string; t7?: string; tmFc?: number | string }[] } } };
  };
  const code = json.response?.header?.resultCode;
  // 03: 특보 자료 없음
  if (code === "03") return { t6: "", t7: "", tmFc: "" };
  if (code !== "00") throw new Error(`특보 응답 ${code}`);
  const item = json.response?.body?.items?.item?.[0];
  if (!item) return null;
  return { t6: item.t6 ?? "", t7: item.t7 ?? "", tmFc: String(item.tmFc ?? "") };
}
