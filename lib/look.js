// 🎨 Site ka ROOP (look) — din/raat (lib/theme.js) se alag cheez.
//
// Owner compare karna chahta hai, isliye koi roop delete nahi hota — sab ek
// saath site mein rehte hain aur <html data-look="…"> batata hai kaunsa chale:
//   "0" purana forest-green · "1" Midnight · "2" Bento · "3" Aurora Dock · "4" Terminal
//   Light: "5" Sky Tabs · "6" Candy · "7" Notion Doc
// Har roop ki CSS app/looks/ mein, `:where(html[data-look="N"])` ke peeche.
//
// layout.js ka <head> script pehle paint se PEHLE hi nishaan laga deta hai
// (warna har page par pehle purana roop jhalakta). Ye file sirf switcher ke
// liye hai. Choice device ki hai, sync nahi hoti — theme jaisi hi.

import { paintBar, getTheme } from "./theme";

export const LOOK_KEY = "cgl.look";
// Default "purana" hai, koi naya roop nahi: options DEKHNE ke liye jude hain,
// aur jab tak owner khud 🎨 Look se na chune, site waisi hi rehni chahiye
// jaisi thi.
export const DEFAULT_LOOK = "0";
export const LOOKS = [
  { id: "0", name: "Purana", short: "Old" },
  { id: "1", name: "Midnight", short: "1" },
  { id: "2", name: "Bento", short: "2" },
  { id: "3", name: "Aurora Dock", short: "3" },
  { id: "4", name: "Terminal", short: "4" },
  { id: "5", name: "Sky Tabs (light)", short: "5" },
  { id: "6", name: "Candy (light)", short: "6" },
  { id: "7", name: "Notion Doc (light)", short: "7" },
];
// Phone/PWA ki patti ka rang — har roop ke apne parde jaisa.
export const LOOK_BAR = {
  "1": "#08080a", "2": "#0a0a0a", "3": "#070a12", "4": "#0b0c0a",
  "5": "#ffffff", "6": "#fff6f1", "7": "#ffffff",
};

export function getLook() {
  if (typeof document === "undefined") return DEFAULT_LOOK;
  return document.documentElement.getAttribute("data-look") || DEFAULT_LOOK;
}

export function setLook(id) {
  if (typeof document === "undefined") return DEFAULT_LOOK;
  const next = LOOKS.some((l) => l.id === id) ? id : DEFAULT_LOOK;
  document.documentElement.setAttribute("data-look", next);
  try { localStorage.setItem(LOOK_KEY, next); } catch { /* private mode */ }
  // theme.js ka paintBar hi — wo ab look bhi dekhta hai.
  paintBar(getTheme());
  return next;
}
