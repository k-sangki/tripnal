// OpenNext가 만든 Worker(.open-next/worker.js) 앞에 엣지 캐시를 둔다 (src/lib/edgePageCache.ts).
// 무료 플랜 CPU 한도(요청당 10ms) 때문에, 한 번 그린 페이지·이미지·예보는 잠시 그대로 돌려준다.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: 빌드(opennextjs-cloudflare build) 뒤에 생기는 파일
import { default as handler } from "./.open-next/worker.js";
import { withEdgeCache } from "./src/lib/edgePageCache";

interface Env {
  /** 배포마다 바뀌는 버전 (wrangler.jsonc version_metadata) */
  CF_VERSION_METADATA?: { id: string };
  /** GitHub 토큰(tripnal 저장소 Actions 쓰기). 예약 작업이 수집 워크플로를 시작할 때 쓴다 */
  COLLECT_DISPATCH_TOKEN?: string;
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

/**
 * 예보 수집(.github/workflows/collect.yml) 시작.
 * GitHub 자체 예약 실행은 정한 시각보다 3~7시간 늦게 시작될 때가 많아(2026-10-31~11-01),
 * Cloudflare 예약 작업(wrangler.jsonc triggers.crons)이 제시간에 workflow_dispatch로 시작시킨다.
 * 토큰이 없거나 실패하면 GitHub 예약 실행이 예전처럼 대신 돈다.
 */
async function dispatchCollect(env: Env): Promise<void> {
  if (!env.COLLECT_DISPATCH_TOKEN) {
    console.warn("collect dispatch: COLLECT_DISPATCH_TOKEN 없음");
    return;
  }
  const res = await fetch("https://api.github.com/repos/k-sangki/tripnal/actions/workflows/collect.yml/dispatches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.COLLECT_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tripnalc-cron",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!res.ok) throw new Error(`collect dispatch ${res.status}: ${(await res.text()).slice(0, 300)}`);
  console.log("collect dispatch ok");
}

const worker = {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    return withEdgeCache(request, ctx, env.CF_VERSION_METADATA?.id ?? "dev", () => handler.fetch(request, env, ctx));
  },
  async scheduled(_controller: unknown, env: Env, ctx: Ctx): Promise<void> {
    ctx.waitUntil(dispatchCollect(env));
  },
};

export default worker;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: 빌드 뒤에 생기는 파일
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
