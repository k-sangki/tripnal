import Link from "next/link";

/** 영어·일본어 페이지 안에서 없는 장소 (예: /en/weather/taean처럼 번역하지 않은 곳) */
export default function ForeignNotFound() {
  return (
    <div className="shell">
      <section className="card seo-text" style={{ marginTop: 40 }}>
        <h1 style={{ fontSize: 20 }}>Page not found · ページが見つかりません</h1>
        <nav className="place-links">
          <Link href="/en">English</Link>
          <Link href="/ja">日本語</Link>
          <Link href="/">한국어</Link>
        </nav>
      </section>
    </div>
  );
}
