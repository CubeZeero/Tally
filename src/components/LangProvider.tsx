"use client";

import { createContext, useContext } from "react";
import { getT, type Lang, type TFunc } from "@/lib/i18n";

const LangContext = createContext<{ lang: Lang; t: TFunc }>({
  lang: "ja",
  t: getT("ja"),
});

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return (
    <LangContext.Provider value={{ lang, t: getT(lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
