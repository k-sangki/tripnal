"use client";

import { useRouter } from "next/navigation";
import type { AriaAttributes, KeyboardEvent, MouseEvent, ReactNode } from "react";

/**
 * 검색에서 뺀(noindex) 페이지로 가는 링크. 화면과 동작은 보통 링크와 같지만 href가 없어 검색 로봇은 따라가지 않는다.
 * 구글 크롤링이 거의 멈춘 동안(2026-11) 적은 크롤을 색인 대상 페이지에 쓰게 하려는 것이다 (월별 평년 날씨·외국어판).
 * 주소는 base + tail로 나눠 받아 HTML·페이지 데이터에 완성된 주소가 통째로 들어가지 않게 한다.
 * 새 탭(Ctrl·Cmd·가운데 클릭)도 그대로 열린다.
 * 회복 뒤 그 페이지를 다시 색인하면 보통 Link로 되돌린다.
 */
export function NoCrawlLink({
  base,
  tail = "",
  className,
  children,
  lang,
  ...aria
}: {
  base: string;
  tail?: string;
  className?: string;
  children: ReactNode;
  lang?: string;
} & Pick<AriaAttributes, "aria-label" | "aria-current">) {
  const router = useRouter();
  const go = (newTab: boolean) => {
    const to = base + tail;
    if (newTab) window.open(to, "_blank", "noopener");
    else router.push(to);
  };
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    go(e.metaKey || e.ctrlKey || e.shiftKey);
  };
  const onAuxClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 1) return;
    e.preventDefault();
    go(true);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    go(e.metaKey || e.ctrlKey);
  };
  return (
    <a role="link" tabIndex={0} className={className} lang={lang} data-nocrawl="" onClick={onClick} onAuxClick={onAuxClick} onKeyDown={onKeyDown} {...aria}>
      {children}
    </a>
  );
}
