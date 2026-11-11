/**
 * 지금 배포된 버전. 열어 둔 화면이 자기 버전(NEXT_PUBLIC_BUILD_ID, 빌드 때 코드에 들어감)과 비교해
 * 새 버전이 나왔는지 안다 (src/components/UpdateWatcher.tsx). 어디에도 보관하지 않는다.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { v: process.env.NEXT_PUBLIC_BUILD_ID ?? "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
