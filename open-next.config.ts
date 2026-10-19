import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// 장소 페이지(30분마다 갱신)의 캐시를 R2에 저장한다
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
