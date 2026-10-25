/**
 * 카톡 등으로 보낼 짧은 주소 (tripnalc.com/s/{id}).
 * 장소 이름이 퍼센트 인코딩되어 주소가 몇 줄씩 길어지는 걸 막는다.
 * id는 주소의 해시라 같은 화면은 늘 같은 짧은 주소가 되고, R2 short/{id}.json 에 원래 주소를 둔다.
 */

export interface Bucket {
  get(key: string): Promise<{ json<T>(): Promise<T> } | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

export async function bucket(): Promise<Bucket> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const env = (await getCloudflareContext({ async: true })).env as unknown as { DATA?: Bucket };
  if (!env.DATA) throw new Error("R2 바인딩(DATA)이 없음");
  return env.DATA;
}

/** 사이트 안 경로+쿼리만 받는다 (다른 사이트로 보내는 데 쓰이지 않게) */
export function validTarget(u: unknown): u is string {
  return typeof u === "string" && u.length <= 800 && u.startsWith("/") && !u.startsWith("//") && !/[\s\\]/.test(u);
}

export const validId = (id: string) => /^[A-Za-z0-9_-]{8}$/.test(id);

export async function shortId(u: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(u)));
  return btoa(String.fromCharCode(...hash.slice(0, 6))).replace(/\+/g, "-").replace(/\//g, "_");
}

export const shortKey = (id: string) => `short/${id}.json`;
