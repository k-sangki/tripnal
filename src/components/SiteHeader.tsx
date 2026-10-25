import Link from "next/link";
import { Logo } from "./Logo";
import { SLOGAN, SLOGAN_C } from "@/lib/brand";

const OV_FONT = `https://fonts.googleapis.com/css2?family=Black+Han+Sans&text=${encodeURIComponent("해외날씨·여행지")}&display=swap`;
/** 띠 아랫줄: 날씨(맑은 곳)와 돈(싼 곳) 두 가지 이득을 짧게, 수고는 적게(3초) */
const OV_SUB = "지금 맑은 곳·싼 곳, 3초 만에 골라보기";

/** overseasBanner: 맨 위 "해외날씨 보러가기" 띠 카드 (해외 날씨 페이지에서는 끈다) */
export function SiteHeader({
  overseasBanner = true,
}: {
  overseasBanner?: boolean;
}) {
  return (
    <>
      <header className="topbar">
        <Link href="/" aria-label="트립날씨 tripnalc 홈" className="brand">
          <Logo />
          <span className="slogan">{SLOGAN_C}</span>
        </Link>
        <nav className="top-nav">
          <Link href="/weather" className="tagline">
            장소별 날씨
          </Link>
        </nav>
      </header>
      {overseasBanner && (
        <Link href="/overseas" className="ov-banner main">
          {/* 제목 글자만 담은 제목용 글꼴 (구글 폰트 text= 부분 로드라 몇 KB) */}
          <link rel="stylesheet" href={OV_FONT} precedence="default" />
          <span className="ov-banner-text">
            <b className="ov-banner-title">
              해외날씨·여행지
              <svg className="ov-plane" viewBox="0 0 24 24" aria-hidden>
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
              </svg>
            </b>
            <small>{OV_SUB}</small>
          </span>
          <span>보러가기 →</span>
        </Link>
      )}
    </>
  );
}

/** langPath: 영어·일본어판이 있는 페이지면 그 경로 (예: "/weather/seoul") → 바닥글에 언어 링크 */
export function SiteFooter({ langPath }: { langPath?: string } = {}) {
  return (
    <footer className="foot">
      {langPath && (
        <nav className="foot-lang" aria-label="Language">
          <span aria-hidden>🌐</span>
          <Link href={`/en${langPath}`} hrefLang="en" lang="en">
            English
          </Link>
          <span aria-hidden>·</span>
          <Link href={`/ja${langPath}`} hrefLang="ja" lang="ja">
            日本語
          </Link>
        </nav>
      )}
      <p>
        트립날씨(tripnalc)는 캠핑날씨·여행날씨·등산·낚시 물때표처럼 대한민국
        레저 활동을 위한 이번주·주말 16일 날씨 서비스입니다. 예보는 수치예보모델
        자료를 3시간 단위로 정리한 것으로 실제 날씨와 다를 수 있습니다.
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

/** "해외날씨 보러가기"와 같은 모양의 띠 카드. 제목 글자만 담은 제목용 글꼴을 따로 불러온다 */
export function StripBanner({ href, title, cta = "보러가기 →", icon }: { href: string; title: string; cta?: string; icon?: string }) {
  const font = `https://fonts.googleapis.com/css2?family=Black+Han+Sans&text=${encodeURIComponent([...new Set(title)].join(""))}&display=swap`;
  return (
    <Link href={href} className={`ov-banner${title.length > 8 ? " long" : ""}`}>
      <link rel="stylesheet" href={font} precedence="default" />
      <b className="ov-banner-title">
        {icon && <i aria-hidden>{icon}</i>}
        {title}
      </b>
      <span>{cta}</span>
    </Link>
  );
}
