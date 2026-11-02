/** robots.txt. 다음 웹마스터 도구 소유 확인 줄을 넣으려고 metadata robots 대신 직접 만든다. */
export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";
const DAUM = "#DaumWebMasterTool:473f7c68444c608ea9926e63f2727f0c5b83d8f667bce74104121bf8652053b4:RXqVBM7XE5wroppTXsoV6g==";

/**
 * AI 검색·답변·학습 로봇을 이름으로 적어 허용한다 (AI 채팅 답변에 인용·추천되도록, 2026-11 SK 결정).
 * 이름이 적힌 로봇은 `*` 묶음을 보지 않으므로 /api/ 차단을 같이 적는다.
 * Cloudflare "AI 봇 정책"도 모두 허용, "봇 기본 설정 동기화"는 꺼 둠 (켜면 이 파일 앞에 차단 줄이 붙음).
 */
const AI_BOTS = [
  // 검색·답변 (질문 받고 페이지를 읽으러 오는 로봇)
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  "MistralAI-User",
  // 학습
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
];

export function GET() {
  const body = [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    ...AI_BOTS.map((b) => `User-Agent: ${b}`),
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${BASE}/sitemap.xml`,
    "",
    DAUM,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
