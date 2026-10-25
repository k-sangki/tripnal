import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

/**
 * 한국어((ko)/layout)와 외국어([lang]/layout) 루트 레이아웃이 따로라 어느 쪽에도 맞지 않는 주소의 404는 여기서 그린다.
 */
export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요 · Page not found",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body>
        <div className="shell">
          <section className="card seo-text" style={{ marginTop: 40 }}>
            <h1 style={{ fontSize: 20 }}>페이지를 찾을 수 없어요</h1>
            <p>Page not found · ページが見つかりません</p>
            <nav className="place-links">
              <Link href="/">트립날씨 홈</Link>
              <Link href="/en">English</Link>
              <Link href="/ja">日本語</Link>
            </nav>
          </section>
        </div>
      </body>
    </html>
  );
}
