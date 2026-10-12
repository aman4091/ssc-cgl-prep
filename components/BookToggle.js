"use client";

// 📖/🪟 — Kitaab roop (app/looks/kitaab.css, TEST) on/off. <html data-book="1">.
// Choice `cgl.book` (device ki, sync nahi); pehle paint se pehle layout.js ka
// <head> script lagata hai.

import { useEffect, useState } from "react";

export const BOOK_KEY = "cgl.book";

export default function BookToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(document.documentElement.getAttribute("data-book") === "1"); }, []);
  const flip = () => {
    const next = !on;
    setOn(next);
    const d = document.documentElement;
    if (next) d.setAttribute("data-book", "1"); else d.removeAttribute("data-book");
    try { localStorage.setItem(BOOK_KEY, next ? "1" : "0"); } catch { /* private mode */ }
    const m = document.getElementById("tc-user");
    if (m) m.setAttribute("content", next ? "#e9dcbc" : "#0d0f14");
  };
  return (
    <button type="button" className="booktog" onClick={flip} title={on ? "Kitaab roop band — Window par wapas" : "Kitaab roop (test) lagao"}>
      {on ? "🪟" : "📖"}
    </button>
  );
}
