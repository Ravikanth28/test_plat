import { useEffect, useState } from "react";

// Reads the theme that index.html already applied to <html data-theme>, lets the
// user flip between light and dark, and remembers the choice in localStorage.
function getInitialTheme() {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
  }
  return "light";
}

export default function ThemeToggle({ className = "btn btn-ghost btn-sm" }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("lm_theme", theme);
    } catch {
      /* ignore storage failures (private mode etc.) */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

  return (
    <button
      className={className}
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
