// 🎨 Site ka ROOP (look) — din/raat (lib/theme.js) se alag cheez.
//
// Owner compare karna chahta hai, isliye koi roop delete nahi hota — sab ek
// saath site mein rehte hain aur <html data-look="…"> batata hai kaunsa chale:
//   "0" purana forest-green · "1" Midnight · "2" Bento · "3" Aurora Dock · "4" Terminal
//   Poora dhaancha alag: "8" Cinema · "9" Split · "10" Timeline · "11" Masonry · "12" HUD
//
// Teen LIGHT roop (5 Sky Tabs, 6 Candy, 7 Notion) the — owner ne hata diye:
// "bas dark hi rakh abhi compare ke liye". Candy ka MENU pasand aaya tha, wo
// app/looks/tilenav.css mein bach gaya hai aur 2/3/4 par chalta hai.
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
  { id: "8", name: "Cinema", short: "8" },
  { id: "9", name: "Split", short: "9" },
  { id: "10", name: "Timeline", short: "10" },
  { id: "11", name: "Masonry", short: "11" },
  { id: "12", name: "HUD Console", short: "12" },
];
// Phone/PWA ki patti ka rang — har roop ke apne parde jaisa.
export const LOOK_BAR = {
  "1": "#08080a", "2": "#0a0a0a", "3": "#070a12", "4": "#0b0c0a",
  "8": "#050505", "9": "#07100d", "10": "#0a0d1a", "11": "#141216", "12": "#03080b",
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
