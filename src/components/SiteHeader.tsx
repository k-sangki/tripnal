import Link from "next/link";
import { Logo } from "./Logo";
import { SLOGAN, SLOGAN_C } from "@/lib/brand";

export function SiteHeader() {
  return (
    <header className="topbar">
      <Link href="/" aria-label="트립날씨 tripnalc 홈" className="brand">
        <Logo />
        <span className="slogan">{SLOGAN_C}</span>
      </Link>
      <nav className="top-nav">
        {/* "해외 날씨" 네 글자만 담은 제목용 글꼴 (구글 폰트 text= 부분 로드라 몇 KB) */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&text=%ED%95%B4%EC%99%B8%EB%82%A0%EC%94%A8&display=swap" precedence="default" />
        <Link href="/overseas" className="nav-overseas">
          해외 날씨
        </Link>
        <Link href="/weather" className="tagline">
          장소별 날씨
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <p>
        트립날씨(tripnalc)는 캠핑날씨·여행날씨·등산·낚시 물때표처럼 대한민국 레저 활동을 위한 이번주·주말 16일 날씨 서비스입니다. 예보는 수치예보모델 자료를 3시간 단위로 정리한 것으로 실제 날씨와 다를 수 있습니다.
        산행·출항 전에는 기상청 특보를 꼭 확인하세요.
      </p>
      <nav className="foot-links">
        <Link href="/about">소개</Link>
        <Link href="/weather">장소별 날씨</Link>
        <Link href="/overseas">해외 날씨</Link>
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/contact">문의</Link>
      </nav>
      <p className="foot-slogan">{SLOGAN}</p>
      <p>© 트립날씨 tripnalc.com</p>
    </footer>
  );
}
