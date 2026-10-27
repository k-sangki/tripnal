import Link from "next/link";
import { SEASON_PAGES } from "@/lib/seasonal";

/** 계절 페이지 목록 한 줄: 장소 이름 · 오른쪽 날씨 요약 · 배지 */
export function SeasonRow({
  href,
  name,
  region,
  main,
  sub,
  badge,
  tone,
}: {
  href: string;
  name: string;
  region: string;
  main: string;
  sub?: string;
  badge?: string;
  tone?: "hi" | "mid";
}) {
  return (
    <li>
      <Link href={href}>
        <span className="wk-name">
          <b>{name}</b>
          <small>{region}</small>
        </span>
        <span className="wk-wx">
          <span>{main}</span>
          {sub && <small>{sub}</small>}
        </span>
        {badge && <span className={`wk-score season-badge${tone ? ` ${tone}` : ""}`}>{badge}</span>}
      </Link>
    </li>
  );
}

/** 다른 계절 페이지로 가는 작은 링크 */
export function SeasonNav({ current }: { current?: string }) {
  const pages = SEASON_PAGES.filter((p) => p.href !== current);
  return (
    <nav className="season-nav" aria-label="계절 날씨">
      {pages.map((p) => (
        <Link key={p.href} href={p.href}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
