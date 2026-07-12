import { useEffect, useRef, useState } from "react";
import { useLang } from "../context/LanguageContext.jsx";

// Small dropdown to switch the app language. Placed in the navbar (avatar panel
// + mobile drawer) and reused on the Settings page.
export default function LanguageToggle({ className = "btn btn-ghost btn-sm" }) {
  const { lang, setLang, languages } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="lang-toggle" ref={ref}>
      <button
        className={className}
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-expanded={open}
        title="Language"
      >
        🌐 {current.native}
      </button>
      {open && (
        <div className="lang-menu" role="menu">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`lang-item ${l.code === lang ? "active" : ""}`}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
            >
              <span>{l.native}</span>
              <span className="muted small">{l.label}</span>
              {l.code === lang && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
