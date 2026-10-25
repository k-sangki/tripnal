import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForeignFooter, ForeignHeader } from "@/components/ForeignHeader";
import { CONTACT_EMAIL } from "@/components/TextPage";
import { isForeignLocale, languageAlternates, localePath, type ForeignLocale } from "@/lib/i18n";

/** 영어·일본어 개인정보처리방침 (한국어 /privacy와 같은 내용) */
const A = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {text}
  </a>
);

const DOC: Record<ForeignLocale, { title: string; body: React.ReactNode }> = {
  en: {
    title: "Privacy Policy",
    body: (
      <>
        <p>Effective: October 20, 2026</p>
        <p>TripNalc (tripnalc.com) works without an account and does not collect names, phone numbers or email addresses. This is how the information that passes through the service is handled.</p>
        <h2>1. Saved in your browser</h2>
        <p>Your temperature unit (°C/°F) and a few display settings are saved only in your browser&apos;s local storage. They are never sent to our server, and you can delete them by clearing site data.</p>
        <h2>2. Third-party services</h2>
        <ul>
          <li>Forecasts: we collect public numerical weather model data in advance, so the places you look at are not sent to outside forecast providers.</li>
          <li>Hosting: Cloudflare may process access logs (IP address, browser information) for security and operation.</li>
        </ul>
        <h2>3. Advertising and cookies</h2>
        <p>
          We show Google AdSense ads. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites. You can turn off personalized ads in{" "}
          {A("https://adssettings.google.com", "Google Ad Settings")} and opt out of third-party vendor cookies at {A("https://www.aboutads.info/choices", "aboutads.info")}. See{" "}
          {A("https://policies.google.com/technologies/partner-sites", "how Google uses information from sites that use its services")}.
        </p>
        <p>
          Visits are counted with Cloudflare Web Analytics (no cookies) and Google Analytics, which uses cookies to tell visits apart; we only look at totals such as page views, referrers and device types. You can opt out with the{" "}
          {A("https://tools.google.com/dlpage/gaoptout", "Google Analytics opt-out add-on")}.
        </p>
        <h2>4. Contact</h2>
        <p>
          Questions about privacy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <h2>5. Changes</h2>
        <p>If this policy changes, we will post the update on this page with a new effective date.</p>
      </>
    ),
  },
  ja: {
    title: "プライバシーポリシー",
    body: (
      <>
        <p>施行日：2026年10月20日</p>
        <p>トリップ天気（tripnalc.com）は会員登録なしで利用でき、氏名・電話番号・メールアドレスなどの個人情報は収集しません。サービスの利用で扱う情報は次のとおりです。</p>
        <h2>1. ブラウザに保存する情報</h2>
        <p>表示に関する設定はお使いのブラウザ（ローカルストレージ）にのみ保存し、サーバーには送りません。ブラウザのサイトデータを削除すると消えます。</p>
        <h2>2. 外部サービス</h2>
        <ul>
          <li>天気予報：公開されている数値予報データをあらかじめ集めて予報を作るため、閲覧した場所を外部の予報提供元に送ることはありません。</li>
          <li>ホスティング：Cloudflareがセキュリティと運用のためにアクセス記録（IPアドレス、ブラウザ情報など）を処理することがあります。</li>
        </ul>
        <h2>3. 広告とCookie</h2>
        <p>
          本サービスはGoogle AdSense広告を掲載しています。Googleなどの第三者配信事業者はCookieを使用して、このサイトや他のサイトへの過去のアクセス情報に基づいて広告を配信します。パーソナライズ広告は
          {A("https://adssettings.google.com", "Googleの広告設定")}で無効にでき、第三者配信事業者のCookieは{A("https://www.aboutads.info/choices", "aboutads.info")}で無効にできます。詳しくは
          {A("https://policies.google.com/technologies/partner-sites", "Googleによるデータの使用について")}をご覧ください。
        </p>
        <p>
          アクセス数はCloudflare Web Analytics（Cookieなし）とGoogleアナリティクスで集計します。Googleアナリティクスはアクセスの区別にCookieを使いますが、私たちが見るのはページビュー・参照元・端末の種類などの合計だけです。
          {A("https://tools.google.com/dlpage/gaoptout", "Googleアナリティクス オプトアウト アドオン")}で収集を止められます。
        </p>
        <h2>4. お問い合わせ</h2>
        <p>
          個人情報に関するお問い合わせ：<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <h2>5. 変更</h2>
        <p>このポリシーを変更する場合は、施行日とともにこのページでお知らせします。</p>
      </>
    ),
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!isForeignLocale(lang)) return {};
  return {
    title: { absolute: `${DOC[lang].title} · TripNalc` },
    alternates: { canonical: localePath(lang, "/privacy"), languages: languageAlternates("/privacy") },
  };
}

export default async function Privacy({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isForeignLocale(lang)) notFound();
  return (
    <div className="shell">
      <ForeignHeader locale={lang} path="/privacy" />
      <article className="card seo-text doc">
        <h1>{DOC[lang].title}</h1>
        {DOC[lang].body}
      </article>
      <ForeignFooter locale={lang} />
    </div>
  );
}
