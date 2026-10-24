// OpenNext가 만든 Worker(.open-next/worker.js) 앞에 엣지 캐시를 둔다 (src/lib/edgePageCache.ts).
// 무료 플랜 CPU 한도(요청당 10ms) 때문에, 한 번 그린 페이지·이미지·예보는 잠시 그대로 돌려준다.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: 빌드(opennextjs-cloudflare build) 뒤에 생기는 파일
import { default as handler } from "./.open-next/worker.js";
import { withEdgeCache } from "./src/lib/edgePageCache";

interface Env {
  /** 배포마다 바뀌는 버전 (wrangler.jsonc version_metadata) */
  CF_VERSION_METADATA?: { id: string };
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    return withEdgeCache(request, ctx, env.CF_VERSION_METADATA?.id ?? "dev", () => handler.fetch(request, env, ctx));
  },
};

export default worker;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: 빌드 뒤에 생기는 파일
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
