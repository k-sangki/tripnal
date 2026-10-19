import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="topbar">
      <Link href="/" aria-label="tripnal 홈">
        <Logo />
      </Link>
      <Link href="/weather" className="tagline">
        장소별 날씨
      </Link>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <p>
        tripnal은 대한민국 레저 활동을 위한 16일 날씨 서비스입니다. 예보는 수치예보모델 자료를 3시간 단위로 정리한 것으로 실제 날씨와 다를 수 있습니다.
        산행·출항 전에는 기상청 특보를 꼭 확인하세요.
      </p>
      <nav className="foot-links">
        <Link href="/about">소개</Link>
        <Link href="/weather">장소별 날씨</Link>
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/contact">문의</Link>
      </nav>
      <p>© tripnal.com</p>
    </footer>
  );
}
