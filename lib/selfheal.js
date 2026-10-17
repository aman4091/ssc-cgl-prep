"use client";

// 🩺 Khud theek ho jana — "Cloud se sab dobara laao" ab HAATH se nahi dabana.
//
// Kahani: sync utarte waqt agar local par likhna fail ho jaye (localStorage
// bhar gaya tha), to wo rows gir jati thin aur cursor phir bhi aage badh jata
// tha — yaani wo records us device par DOBARA kabhi aate hi nahi the. PC ka
// fact log 265 par ruka raha jabki cloud mein 366 the, aur ⭐ IMP ka pata bhi
// wahin gir gaya. Dono jadein ab theek hain (fact log/one-liner/IMP IndexedDB
// mein; likhna fail ho to cursor nahi badhta), par JO PEHLE HI chhoot chuka
// hai wo apne aap wapas nahi aata: us device ka cursor aage ja chuka hai.
//
// Isliye ye: har device par EK BAAR, chupchaap, poora dobara utaro (cursor aur
// yaad mita kar). Owner ko koi button nahi dabana. Flag tabhi lagta hai jab
// sach mein ho jaye — fail ho to agli baar app khulne par phir koshish.
//
// Aage kabhi aisi hi marammat chahiye ho to bas `HEAL` ka number badha dena.

import { resyncAll, syncReady } from "./sync";

const HEAL = "cgl.heal.v1";

export async function healOnce() {
  if (typeof window === "undefined") return false;
  try { if (localStorage.getItem(HEAL)) return false; } catch { return false; }
  // Sync set hi nahi (nayi device, ya code/URL nahi bhara) — flag mat lagao,
  // taaki set hone ke baad ye chal sake.
  if (!syncReady()) return false;
  try {
    await resyncAll();
    try { localStorage.setItem(HEAL, new Date().toISOString()); } catch { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent("cgl:sync-applied", { detail: { heal: true } })); } catch { /* ignore */ }
    return true;
  } catch {
    return false;   // net nahi / timeout — agli baar phir
  }
}
