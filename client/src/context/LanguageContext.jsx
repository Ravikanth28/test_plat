import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { DEFAULT_LANG, LANGUAGES, translate } from "../i18n.js";

const LanguageContext = createContext();

const STORAGE_KEY = "lm_lang"; // remembered choice (per-device)
const VALID = new Set(LANGUAGES.map((l) => l.code));

function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID.has(saved)) return saved;
    // Fall back to the browser's language if we support it.
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    if (VALID.has(nav)) return nav;
  } catch {
    /* ignore storage/nav errors */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  // Persist the choice and reflect it on <html lang> for accessibility.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
    }
  }, [lang]);

  const setLang = useCallback((code) => {
    if (VALID.has(code)) setLangState(code);
  }, []);

  // t(key, fallback) — translate for the active language.
  const t = useCallback((key, fallback) => translate(lang, key, fallback), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);

// Convenience hook when a component only needs the translate function.
export const useT = () => useContext(LanguageContext).t;
