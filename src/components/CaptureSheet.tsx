"use client";

import { useEffect, useState } from "react";
import { domToBlob } from "modern-screenshot";
import { Logo } from "./Logo";

interface Props {
  target: () => HTMLElement | null;
  fileName: string;
  shareTitle: string;
  shareUrl: string;
  onClose: () => void;
}

/** 캔버스 최대 면적(모바일 사파리 약 1,670만 px)을 넘지 않게 배율을 정한다 */
function pickScale(el: HTMLElement) {
  const area = el.scrollWidth * el.scrollHeight;
  // 휴대폰 크기는 3배로 선명하게, 모니터 크기는 2배까지
  const max = el.offsetWidth < 600 ? 3 : 2;
  return Math.max(1, Math.min(max, Math.sqrt(16_000_000 / area)));
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export async function captureElement(el: HTMLElement): Promise<Blob> {
  el.classList.add("capturing");
  try {
    await document.fonts?.ready;
    await nextFrame();
    const blob = await domToBlob(el, {
      scale: pickScale(el),
      backgroundColor: "#0E3B36",
      type: "image/png",
      filter: (n) => !(n instanceof HTMLElement && (n.classList.contains("ad-slot") || n.classList.contains("no-capture"))),
    });
    if (!blob) throw new Error("capture failed");
    return blob;
  } finally {
    el.classList.remove("capturing");
  }
}

export function CaptureSheet({ target, fileName, shareTitle, shareUrl, onClose }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const el = target();
    if (!el) return;
    let url: string | null = null;
    captureElement(el)
      .then((b) => {
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreview(url);
      })
      .catch(() => setError(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [target]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const file = blob ? new File([blob], fileName, { type: "image/png" }) : null;
  const canShareFile = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });

  const save = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = fileName;
    a.click();
    setToast("이미지를 저장했어요");
  };

  const shareImage = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: shareTitle, text: `${shareTitle}\n${shareUrl}` });
    } catch {
      // 사용자가 취소한 경우
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("링크를 복사했어요");
    } catch {
      setToast("복사하지 못했어요");
    }
  };

  const naver = () => {
    const u = `https://share.naver.com/web/shareView?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`;
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=700");
  };

  return (
    <div className="sheet-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="캡처 공유">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Logo size={18} />
          <button onClick={onClose} aria-label="닫기" style={{ fontSize: 22, width: 36, height: 36 }}>
            ✕
          </button>
        </div>
        {error ? (
          <div className="error">캡처하지 못했습니다. 다시 시도해 주세요.</div>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="sheet-preview" src={preview} alt="날씨 캡처 미리보기" />
        ) : (
          <div className="skeleton" />
        )}
        <div className="share-grid">
          {canShareFile && (
            <button className="share-btn primary" onClick={shareImage} disabled={!blob}>
              이미지 공유하기 (카톡·인스타·카페·블로그)
            </button>
          )}
          <button className={`share-btn${canShareFile ? "" : " primary"}`} onClick={save} disabled={!blob}>
            이미지 저장
          </button>
          <button className="share-btn" onClick={shareLink}>
            링크 공유
          </button>
          <button className="share-btn naver" onClick={naver}>
            네이버 블로그·카페
          </button>
          <button className="share-btn" onClick={copyLink}>
            링크 복사
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          블로그·카페 글에는 저장한 이미지를 올리고 링크를 함께 붙여 보세요.
        </p>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
