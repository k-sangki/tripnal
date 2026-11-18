"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/**
 * 링크 주소(href)는 조건 없는 본체 주소로 두고, 누를 때만 날짜·레저 조건(query)을 붙여 이동한다.
 * 구글봇은 본체 주소만 보고 내부 링크 점수도 그 주소로 흐른다 (2026-11-19, ?from= 변형 주소 정리).
 * 새 탭·가운데 클릭은 본체 주소로 열린다.
 */
export function QueryLink({
  href,
  query,
  className,
  onClick,
  children,
}: {
  href: string;
  query?: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (!query || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(`${href}${query.startsWith("?") ? query : `?${query}`}`);
  };
  return (
    <Link href={href} className={className} onClick={go}>
      {children}
    </Link>
  );
}
