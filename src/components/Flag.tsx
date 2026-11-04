import type { ReactNode } from "react";

/**
 * 예보 모델 기관 나라 국기 (그림). 국기 이모지는 윈도우에서 "EU" 같은 글자로 나와서 SVG로 그린다.
 * ECMWF=유럽연합, GFS=미국, ICON=독일.
 */
export type FlagCode = "eu" | "us" | "de";

const STARS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return `<circle cx="${(12 + 5.2 * Math.sin(a)).toFixed(2)}" cy="${(8 - 5.2 * Math.cos(a)).toFixed(2)}" r="0.85" fill="#ffd617"/>`;
}).join("");
const S = 16 / 13;
const INNER: Record<FlagCode, string> = {
  eu: `<rect width="24" height="16" fill="#1f3f9a"/>${STARS}`,
  us:
    `<rect width="24" height="16" fill="#fff"/>` +
    [0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${(i * S).toFixed(3)}" width="24" height="${S.toFixed(3)}" fill="#c8102e"/>`).join("") +
    `<rect width="10.5" height="${(S * 7).toFixed(3)}" fill="#1f3a7a"/>`,
  de: `<rect width="24" height="5.34" fill="#111"/><rect y="5.33" width="24" height="5.34" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/>`,
};

/** 공유 그림(/api/og)처럼 <img>로 넣을 때 쓰는 SVG data URL */
export function flagDataUrl(c: FlagCode) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16">${INNER[c]}</svg>`)}`;
}

export function Flag({ c }: { c: FlagCode }) {
  return <svg className="flag" viewBox="0 0 24 16" aria-hidden width="1.25em" height="0.83em" dangerouslySetInnerHTML={{ __html: INNER[c] }} />;
}

/** 모델·나라 이름 → 국기. "유럽(ECMWF)"처럼 나라 이름이 앞에 붙으면 나라 이름 앞에 넣는다 */
const FLAG_RE = /(유럽|미국|독일)\((ECMWF|GFS|ICON)\)|\b(ECMWF|GFS|ICON)\b/g;
export const FLAG_OF: Record<string, FlagCode> = { ECMWF: "eu", GFS: "us", ICON: "de" };

/** 글 안의 ECMWF·GFS·ICON 앞에 국기를 붙인다 */
export function withFlags(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(FLAG_RE)) {
    const model = m[2] ?? m[3];
    out.push(text.slice(last, m.index));
    out.push(
      // 국기와 이름이 줄 끝에서 갈라지지 않게
      <span key={m.index} className="flag-w">
        <Flag c={FLAG_OF[model]} />
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (!out.length) return text;
  out.push(text.slice(last));
  return out;
}
