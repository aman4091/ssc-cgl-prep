// 🌗 Din / raat.
//
// Site ka poora design token-driven hai (app/globals.css ka :root, aur
// app/exam.css ka .examskin). Raat wali theme sirf wahi tokens doosre rang par
// mod deti hai — uska apna koi layout, koi rule, koi radius nahi. Isliye yahan
// ka kaam bas itna hai: <html> par data-theme="dark" lagana ya hatana.
//
// Nishaan <html> par lagta hai, <body> par nahi — kyunki layout.js ka chhota
// script use pehle paint se PEHLE hi set kar deta hai (tab tak body hoti hi
// nahi). Warna raat wale user ko har page par ek safed jhapki milti.
//
// Choice is DEVICE ki hai, sync nahi hoti (lib/syncitems.js ka LOCAL_ONLY) —
// tablet raat mein bistar par chalti hai aur laptop din mein mez par; ek jagah
// dark karne se doosri jagah dark ho jana galat hai.

export const THEME_KEY = "cgl.theme";

// Sirf ye do. "system" jaan-boojh kar nahi: test ke beech mein OS ka schedule
// badal jaye aur poori screen palat jaye — us se bura kuch nahi.
export const THEMES = ["light", "dark"];

// Phone ka address bar / PWA ki patti.
//
// layout.js do <meta name="theme-color"> deta hai — ek light ke liye, ek dark
// ke liye — aur browser PEHLA aisa meta uthata hai jiski media match kare. Un
// dono mein se ek hamesha match karti hai, isliye aage koi aur meta jodne se
// kuch nahi hota. Rasta ek hi hai: bina-media wala apna meta head ke SABSE
// AAGE lagana, taaki wo pehle mile aur OS ki pasand ko haraye. User ne theme
// khud chuni hai — usi ka faisla chalna chahiye.
export const BAR = { light: "#ffffff", dark: "#141922" };

export function paintBar(theme) {
  try {
    let m = document.getElementById("tc-user");
    if (!m) {
      m = document.createElement("meta");
      m.id = "tc-user";
      m.name = "theme-color";
      document.head.prepend(m);
    }
    m.setAttribute("content", theme === "dark" ? BAR.dark : BAR.light);
  } catch { /* SSR / head abhi bana hi nahi */ }
}

export function getTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(t) {
  if (typeof document === "undefined") return "light";
  const next = t === "dark" ? "dark" : "light";
  const el = document.documentElement;
  if (next === "dark") el.setAttribute("data-theme", "dark");
  else el.removeAttribute("data-theme");
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode / quota */ }
  paintBar(next);
  // Canvas aur woh sab jo apna rang JS mein padhte hain (stylus wala parda)
  // turant sudhar jayein.
  try { window.dispatchEvent(new CustomEvent("cgl:theme-changed", { detail: { theme: next } })); }
  catch { /* SSR */ }
  return next;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}
