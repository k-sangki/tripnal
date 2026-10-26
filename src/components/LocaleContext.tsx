"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { tr, type Locale } from "@/lib/i18n";
import { METRIC, defaultUnits, type Units } from "@/lib/units";

interface Value {
  locale: Locale;
  units: Units;
  setUnits: (u: Units) => void;
}

/** 감싸지 않은 화면(한국어 페이지 전부)은 한국어·°C·m/s 그대로다 */
const Ctx = createContext<Value>({ locale: "ko", units: METRIC, setUnits: () => {} });

const UNIT_KEY = "tripnal:temp-unit";

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [units, setUnitsState] = useState<Units>(() => defaultUnits(locale));

  // 영어판에서 고른 °F는 기억해 둔다
  useEffect(() => {
    if (locale !== "en") return;
    try {
      if (window.localStorage.getItem(UNIT_KEY) === "F") {
        // 브라우저 저장소는 하이드레이션 이후에만 읽을 수 있다
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUnitsState((u) => ({ ...u, temp: "F" }));
      }
    } catch {}
  }, [locale]);

  function setUnits(u: Units) {
    setUnitsState(u);
    try {
      window.localStorage.setItem(UNIT_KEY, u.temp);
    } catch {}
  }

  return <Ctx.Provider value={{ locale, units, setUnits }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}

/** 화면 글자 번역 함수 (한국어 문장을 키로) */
export function useT() {
  const { locale } = useContext(Ctx);
  return (ko: string) => tr(locale, ko);
}
