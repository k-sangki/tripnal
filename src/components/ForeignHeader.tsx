import Link from "next/link";
import { SLOGAN_FOREIGN } from "@/lib/brand";
import { LANG_TAG, LOCALE_NAME, localePath, type ForeignLocale, type Locale } from "@/lib/i18n";
import { Logo } from "./Logo";
import { CONTACT_EMAIL } from "./TextPage";

/**
 * 영어·일본어·중국어 페이지 머리. 로고 옆 슬로건과 언어 전환(지금 보는 페이지의 다른 언어판)만 둔다.
 * path: 한국어 기준 경로 ("/weather/seoul"), koPath: 한국어판이 없는 페이지는 한국어 링크를 따로 준다
 */
export function ForeignHeader({ locale, path, koPath = path }: { locale: ForeignLocale; path: string; koPath?: string }) {
  const others: Locale[] = (["en", "ja", "zh", "ko"] as const).filter((l) => l !== locale);
  return (
    <header className="topbar topbar-foreign">
      <Link href={localePath(locale, "/")} aria-label={`TripNalc ${LOCALE_NAME[locale]}`} className="brand">
        <Logo />
        <span className="slogan">{SLOGAN_FOREIGN[locale]}</span>
      </Link>
      <nav className="top-nav lang-nav" aria-label="Language">
        {others.map((l) => (
          <Link key={l} href={l === "ko" ? koPath : localePath(l, path)} hrefLang={LANG_TAG[l]} lang={LANG_TAG[l]} className="tagline">
            {LOCALE_NAME[l]}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const FOOT: Record<ForeignLocale, { text: string; places: string; ko: string; about: string; privacy: string; contact: string }> = {
  en: {
    text: "TripNalc Weather is a 16-day, 3-hourly forecast for travel in South Korea, using the middle value of three global weather models (ECMWF, GFS, ICON). Forecasts can differ from actual weather; for mountain or sea trips, also check official warnings from the Korea Meteorological Administration.",
    places: "All places",
    ko: "한국어",
    about: "About",
    privacy: "Privacy",
    contact: "Contact",
  },
  ja: {
    text: "トリップ天気（Tripnalc）は、韓国旅行のための最大2週間・3時間ごとの天気予報です。世界の3つの予報モデル（ECMWF・GFS・ICON）の中間値を使っています。予報は実際の天気と異なることがあります。登山や海に出る前は韓国気象庁の注意報・警報もご確認ください。",
    places: "場所の一覧",
    ko: "한국어",
    about: "サイトについて",
    privacy: "プライバシーポリシー",
    contact: "お問い合わせ",
  },
  zh: {
    text: "旅遊天氣（TripNalc）提供韓國旅遊用的最長16天、每3小時天氣預報，採用全球三個預報模式（ECMWF、GFS、ICON）的中間值。預報可能與實際天氣不同；登山或出海前，也請確認韓國氣象廳發布的特報。",
    places: "地點一覽",
    ko: "한국어",
    about: "關於本站",
    privacy: "隱私權政策",
    contact: "聯絡我們",
  },
};

export function ForeignFooter({ locale }: { locale: ForeignLocale }) {
  const f = FOOT[locale];
  return (
    <footer className="foot">
      <p>{f.text}</p>
      <nav className="foot-links">
        <Link href={localePath(locale, "/")}>{f.places}</Link>
        <Link href={localePath(locale, "/about")}>{f.about}</Link>
        <Link href={localePath(locale, "/privacy")}>{f.privacy}</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{f.contact}</a>
        <Link href="/" hrefLang="ko" lang="ko">
          {f.ko}
        </Link>
      </nav>
      <p className="foot-slogan">{SLOGAN_FOREIGN[locale]}</p>
      <p>© tripnalc.com</p>
    </footer>
  );
}
