"use client";

// Day / night toggle. Sets data-theme="dark" on <html> and remembers the choice
// in localStorage under "ui.theme" (NOT a cgl.* key, so the preference stays
// per-device and doesn't ride cloud sync). A tiny inline script in the layout
// applies the saved theme before paint so there's no light-flash on load.

import { useEffect, useState } from "react";

const KEY = "ui.theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch { /* ignore */ }
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* ignore */ }
  };

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Din / Raat mode" title="Din / Raat mode">
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
