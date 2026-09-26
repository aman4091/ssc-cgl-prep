// 🎨 Site ka ROOP (look) — din/raat (lib/theme.js) se alag cheez.
//
// Owner compare karna chahta hai, isliye koi roop delete nahi hota — sab ek
// saath site mein rehte hain aur <html data-look="…"> batata hai kaunsa chale:
//   "0" purana forest-green · "1" Midnight · "2" Bento · "3" Aurora Dock · "4" Terminal
//   Light: "5" Sky Tabs · "6" Candy · "7" Notion Doc
//   Dark, poora dhaancha alag: "8" Cinema · "9" Split · "10" Timeline · "11" Masonry · "12" HUD
//   Aur: 13 Window · 14 Kanban · 15 Landing · 16 Folder · 17 Mosaic · 18 Orbit
//        19 Pocket · 20 Sheet · 21 Bands · 22 Chat
// Har roop ki CSS app/looks/ mein, `:where(html[data-look="N"])` ke peeche.
//
// layout.js ka <head> script pehle paint se PEHLE hi nishaan laga deta hai
// (warna har page par pehle purana roop jhalakta). Ye file sirf switcher ke
// liye hai. Choice device ki hai, sync nahi hoti — theme jaisi hi.

import { paintBar, getTheme } from "./theme";

export const LOOK_KEY = "cgl.look";
export const DEFAULT_LOOK = "13";
export const LOOKS = [
  { id: "0", name: "Purana", short: "Old" },
  { id: "1", name: "Midnight", short: "1" },
  { id: "2", name: "Bento", short: "2" },
  { id: "3", name: "Aurora Dock", short: "3" },
  { id: "4", name: "Terminal", short: "4" },
  { id: "5", name: "Sky Tabs (light)", short: "5" },
  { id: "6", name: "Candy (light)", short: "6" },
  { id: "7", name: "Notion Doc (light)", short: "7" },
  { id: "8", name: "Cinema", short: "8" },
  { id: "9", name: "Split", short: "9" },
  { id: "10", name: "Timeline", short: "10" },
  { id: "11", name: "Masonry", short: "11" },
  { id: "12", name: "HUD Console", short: "12" },
  { id: "13", name: "Window", short: "13" },
  { id: "14", name: "Kanban", short: "14" },
  { id: "15", name: "Landing", short: "15" },
  { id: "16", name: "Folder", short: "16" },
  { id: "17", name: "Mosaic", short: "17" },
  { id: "18", name: "Orbit", short: "18" },
  { id: "19", name: "Pocket", short: "19" },
  { id: "20", name: "Sheet", short: "20" },
  { id: "21", name: "Bands", short: "21" },
  { id: "22", name: "Chat", short: "22" },
];
// Phone/PWA ki patti ka rang — har roop ke apne parde jaisa.
export const LOOK_BAR = {
  "1": "#08080a", "2": "#0a0a0a", "3": "#070a12", "4": "#0b0c0a",
  "5": "#ffffff", "6": "#fff6f1", "7": "#ffffff",
  "8": "#050505", "9": "#07100d", "10": "#0a0d1a", "11": "#141216", "12": "#03080b",
  "13": "#0d0f14", "14": "#0f141c", "15": "#07060b", "16": "#120e0a", "17": "#060808", "18": "#06051a", "19": "#050505", "20": "#0f1512", "21": "#081120", "22": "#0b141a",
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
