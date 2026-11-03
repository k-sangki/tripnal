/** 공유할 주소에서 utm_* 를 뗀다 (공유받은 사람이 다시 공유할 때 유입 표시가 겹치지 않게) */
export function stripUtm(url: string): string {
  try {
    const u = new URL(url);
    for (const k of Array.from(u.searchParams.keys())) if (k.startsWith("utm_")) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url;
  }
}

/** 주소에 유입 표시를 붙인다 */
export function withUtm(url: string, source: string, medium = "share"): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", medium);
    return u.toString();
  } catch {
    return url;
  }
}
