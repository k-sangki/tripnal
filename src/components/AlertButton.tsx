"use client";

import { useEffect, useState } from "react";

interface Props {
  place: { name: string; lat: number; lon: number; elevation?: number; slug?: string };
  act: string;
  from: string;
  to: string;
  today: string;
  /** 이 장소에 켜 둔 알림의 기간으로 화면을 옮긴다 */
  onPeriod: (p: { from: string; to: string }) => void;
}

/** 이 브라우저에서 켠 알림 */
interface Saved {
  id: string;
  lat: string;
  lon: string;
  from: string;
  to: string;
}

/** 예전 형식: { "위도,경도,시작,끝": id } */
const KEY = "tripnal:alerts";

function load(today: string): Saved[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const list: Saved[] = Array.isArray(raw)
      ? raw
      : Object.entries(raw as Record<string, string>).map(([k, id]) => {
          const [lat, lon, from, to] = k.split(",");
          return { id, lat, lon, from, to };
        });
    // 끝난 여행은 서버에서도 지워지므로 여기서도 뺀다
    return list.filter((a) => a.to >= today);
  } catch {
    return [];
  }
}

function save(all: Saved[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

/** 주소에 기간 없이 연 경우(홈 화면 앱 등)에만, 켜 둔 알림의 기간을 한 번 보여 준다 */
let autoPeriod = typeof window !== "undefined" && !new URLSearchParams(window.location.search).has("from");

function short(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function keyBytes(b64: string) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/**
 * "날씨 바뀌면 알림" 버튼. 회원가입 없이 브라우저 푸시로, 비·바람·기온 예보가 크게 바뀌면(좋아지든 나빠지든) 알려 준다.
 * 아이폰은 홈 화면에 추가한 앱에서만 웹 푸시를 받을 수 있어 그 방법을 안내한다.
 */
export function AlertButton({ place, act, from, to, today, onPeriod }: Props) {
  const lat = place.lat.toFixed(4);
  const lon = place.lon.toFixed(4);
  const [alerts, setAlerts] = useState<Saved[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // 브라우저 저장소는 하이드레이션 이후에만 읽을 수 있다
    const list = load(today);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts(list);
    const here = list.filter((a) => a.lat === lat && a.lon === lon);
    if (autoPeriod && here.length) onPeriod(here[0]);
    autoPeriod = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!alerts) return null;
  const here = alerts.filter((a) => a.lat === lat && a.lon === lon);
  const current = here.find((a) => a.from === from && a.to === to);
  const on = !!current;

  const turnOn = async () => {
    if (isIos() && !isStandalone()) {
      setMsg("아이폰은 아래 '홈 화면에 추가'로 앱을 추가한 뒤, 그 앱에서 알림을 켤 수 있어요.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMsg("이 브라우저는 알림을 지원하지 않아요.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setMsg("알림이 차단되어 있어요. 브라우저 설정에서 tripnalc.com 알림을 허용해 주세요.");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { publicKey } = await fetch("/api/alerts").then((r) => r.json());
    if (!publicKey) throw new Error("no key");
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), place, act, from, to }),
    }).then((r) => r.json());
    if (!res.id) throw new Error(res.error);
    const next = [...load(today), { id: res.id, lat, lon, from, to }];
    save(next);
    setAlerts(next);
    setMsg("이 기간 예보가 크게 바뀌면(좋아져도) 알려 드릴게요. 여행이 끝나면 알림도 자동으로 끝나요.");
  };

  const turnOff = async () => {
    await fetch(`/api/alerts?id=${current!.id}`, { method: "DELETE" });
    const next = load(today).filter((a) => a.id !== current!.id);
    save(next);
    setAlerts(next);
    setMsg("알림을 껐어요.");
  };

  const click = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await (on ? turnOff() : turnOn());
    } catch (e) {
      console.error(e);
      setMsg("알림을 설정하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className={`pill alert-pill${on ? " on" : ""}`} onClick={click} disabled={busy} aria-pressed={on}>
        {on ? "🔔 알림 켜짐" : "🔔 날씨 바뀌면 알림"}
      </button>
      {/* 같은 장소의 다른 기간에 켜 둔 알림: 누르면 그 기간으로 */}
      {here
        .filter((a) => a !== current)
        .map((a) => (
          <button key={a.id} className="pill alert-pill on" onClick={() => onPeriod(a)}>
            🔔 {short(a.from)}~{short(a.to)} 알림 켜짐
          </button>
        ))}
      {msg && <div className="alert-msg">{msg}</div>}
    </>
  );
}
