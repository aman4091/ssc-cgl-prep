"use client";

import { useEffect, useState } from "react";
import { getTheme, toggleTheme } from "@/lib/theme";

// 🌗 Din/raat ka button — sabse upar wali patti mein, ☰ ke saamne.
//
// Pehli render par HAMESHA "light" maanta hai (server bhi wahi bhejta hai) aur
// asli haal mount ke baad padhta hai. Render ke dauraan localStorage padhne se
// server aur client ka HTML alag ho jata, aur React poora tree phenk kar
// dobara banata — wahi galti site ke baaki page pehle kar chuke hain.
//
// Isse theme LAGTI nahi hai — wo layout.js ka <head> wala script pehle paint se
// pehle hi kar chuka hota hai. Ye button sirf uska switch hai.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(getTheme() === "dark"); }, []);

  return (
    <button
      className="themetog"
      type="button"
      onClick={() => setDark(toggleTheme() === "dark")}
      aria-label={dark ? "Din wali theme" : "Raat wali theme"}
      title={dark ? "Din (light)" : "Raat (dark)"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
