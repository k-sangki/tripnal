/**
 * 해외 지명처럼 표기가 여러 가지인 이름을 찾기 위한 느슨한 검색.
 * 한글은 자모로 풀고 된소리·거센소리·비슷한 모음을 한 소리로 모은 뒤(호찌민=호치민, 푸껫=푸켓),
 * 검색어가 이름 안 어딘가에 오타 몇 개 이내로 들어 있는지 본다. 초성(ㄷㅋ → 도쿄)과 영문도 찾는다.
 */

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** 외래어 표기에서 서로 바뀌어 쓰이는 소리를 하나로 */
const SAME: Record<string, string> = {
  ㄲ: "ㄱ", ㅋ: "ㄱ", ㄸ: "ㄷ", ㅌ: "ㄷ", ㅃ: "ㅂ", ㅍ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ", ㅊ: "ㅈ",
  ㅐ: "ㅔ", ㅒ: "ㅖ", ㅙ: "ㅞ", ㅚ: "ㅞ", ㅢ: "ㅣ",
};
const same = (c: string) => SAME[c] ?? c;

/** 글자를 자모로 풀어 소리를 모은 문자열. 영문은 소문자, 공백·기호는 뺀다 */
export function soundKey(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase()) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) {
      const jong = JONG[code % 28];
      out += same(CHO[Math.floor(code / 588)]) + same(JUNG[Math.floor((code % 588) / 28)]);
      if (jong) out += same(jong);
    } else if (/[a-z0-9ㄱ-ㆎ]/.test(ch)) out += same(ch);
  }
  return out;
}

/** 초성만 (도쿄 → ㄷㅋ). 검색어가 초성만으로 되어 있을 때 쓴다 */
export function initials(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) out += CHO[Math.floor(code / 588)];
  }
  return out;
}

/** 검색어 q가 t 안의 어느 부분과 가장 가깝게 맞을 때의 편집 거리 (근사 부분 문자열 검색) */
export function substringDistance(q: string, t: string): number {
  if (!q) return 0;
  let prev = new Array(t.length + 1).fill(0);
  for (let i = 1; i <= q.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (q[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.min(...prev);
}

/**
 * 이름들(names) 중 가장 잘 맞는 정도. 작을수록 잘 맞고, 안 맞으면 null.
 * 0: 그대로 포함(앞에서 시작하면 더 작게), 1~: 오타 수에 따른 느슨한 일치
 */
export function matchScore(query: string, names: string[]): number | null {
  const q = query.trim();
  if (!q) return null;
  const qs = soundKey(q);
  if (!qs) return null;
  const onlyInitials = /^[ㄱ-ㅎ\s]+$/.test(q);
  let best: number | null = null;
  const take = (v: number) => (best = best == null ? v : Math.min(best, v));
  for (const n of names) {
    if (onlyInitials) {
      const ini = initials(n);
      const qi = q.replace(/\s/g, "");
      if (ini.startsWith(qi)) take(0);
      else if (ini.includes(qi)) take(0.5);
      continue;
    }
    const ns = soundKey(n);
    if (ns.startsWith(qs)) take(0);
    else if (ns.includes(qs)) take(0.5);
    else {
      // 자모 4개당 한 번까지 틀려도 된다 (짧은 검색어는 정확히 맞아야 한다)
      const allowed = Math.floor(qs.length / 4);
      if (allowed > 0) {
        const d = substringDistance(qs, ns);
        if (d <= allowed) take(1 + d);
      }
    }
  }
  return best;
}
