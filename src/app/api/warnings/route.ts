import { fetchStatus, matchWarnings } from "@/lib/warnings";

/** 특보 현황은 모든 장소가 같이 쓰므로 Worker 메모리에 10분 둔다 */
let memo: { at: number; status: Promise<Awaited<ReturnType<typeof fetchStatus>>> } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") ?? "";
  const key = process.env.DATA_GO_KR_KEY;
  if (!key || !address) return Response.json({ warnings: [] });
  try {
    if (!memo || Date.now() - memo.at > 10 * 60e3) {
      memo = { at: Date.now(), status: fetchStatus(key) };
      memo.status.catch(() => (memo = null));
    }
    const status = await memo.status;
    const warnings = status ? matchWarnings(status.t6, status.t7, address) : [];
    return Response.json({ warnings }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    console.error(e);
    return Response.json({ warnings: [] });
  }
}
