import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/LocaleContext";
import { ADSENSE, RootDocument, SITE_VIEWPORT } from "@/components/RootDocument";
import { FOREIGN_LOCALES, LANG_TAG, OG_LOCALE, SITE_NAME, isForeignLocale } from "@/lib/i18n";
import "../globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";

const DESCRIPTION = {
  en: "16-day, 3-hourly weather for traveling in Korea, in Korea time. Seoul, Busan, Jeju, mountains and ski resorts, from the middle of three forecast models.",
  ja: "韓国旅行のための天気予報。ソウル・釜山・済州・山・スキー場の最大2週間・3時間ごとの予報を韓国時間で。",
  zh: "韓國旅遊天氣預報：首爾、釜山、濟州、登山與滑雪場，最長16天、每3小時預報，以韓國時間顯示。",
} as const;

/** /en, /ja, /zh 만 있다. 다른 값은 404 */
export const dynamicParams = false;
export function generateStaticParams() {
  return FOREIGN_LOCALES.map((lang) => ({ lang }));
}

export const viewport = SITE_VIEWPORT;

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isForeignLocale(lang)) return {};
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME[lang], template: "%s" },
    description: DESCRIPTION[lang],
    applicationName: SITE_NAME[lang],
    openGraph: { type: "website", siteName: SITE_NAME[lang], locale: OG_LOCALE[lang], description: DESCRIPTION[lang] },
    formatDetection: { telephone: false },
    other: ADSENSE ? { "google-adsense-account": ADSENSE } : {},
  };
}

/** 영어·일본어·중국어 페이지의 루트 레이아웃 (한국어는 (ko)/layout.tsx) */
export default async function ForeignLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isForeignLocale(lang)) notFound();
  return (
    <RootDocument lang={LANG_TAG[lang]}>
      <LocaleProvider locale={lang}>{children}</LocaleProvider>
    </RootDocument>
  );
}
