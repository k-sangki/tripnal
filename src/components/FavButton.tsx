"use client";

import { useEffect, useState } from "react";
import { FAV_EVENT, FAV_MAX, favKey, loadFavs, toggleFav, type FavPlace } from "@/lib/favorites";
import { trackEvent } from "@/lib/track";

/** 장소 이름 아래 "☆ 내 장소" 단추. 누르면 홈 맨 위 내 장소 띠에 들어간다 */
export function FavButton({ place }: { place: FavPlace }) {
  const k = favKey(place);
  const [on, setOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setOn(loadFavs().some((x) => favKey(x) === k));
    sync();
    window.addEventListener(FAV_EVENT, sync);
    return () => window.removeEventListener(FAV_EVENT, sync);
  }, [k]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const click = () => {
    const full = !on && loadFavs().length >= FAV_MAX;
    const added = toggleFav(place);
    trackEvent(added ? "favorite_add" : "favorite_remove");
    setToast(added ? (full ? `내 장소는 ${FAV_MAX}곳까지라 가장 오래된 곳을 뺐어요` : "내 장소에 담았어요. 홈 맨 위에서 볼 수 있어요") : "내 장소에서 뺐어요");
  };

  return (
    <>
      <button type="button" className={`pill alert-pill fav-pill${on ? " on" : ""}`} aria-pressed={on} onClick={click}>
        {on ? "★" : "☆"} 내 장소
      </button>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
