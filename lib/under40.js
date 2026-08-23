// ⏱️ Jo question overlay par 40 second ke andar nipta diye gaye.
//
// Sach OVERLAY ke paas hai, yahan nahi. Wahan question kholte hi 40 second ka
// timer chalta hai; time ke andar ho gaya to uski file solved_under_40 mein
// chali jati hai. Ye page uski sirf ek nakal rakhta hai (qid ki list), jo
// OverlayInbox har poll par overlay se utha leta hai.
//
// Isliye yahan koi "mark under 40" nahi hai, aur jaan-boojh kar nahi hai —
// warna do jagah do sach ban jate. Site sirf itna karti hai: aise question
// aam list se hata kar apni alag shelf mein rakh deti hai (Answers board ka
// "Kahan se aaye" dropdown), taaki jo abhi nahi hue wahi saamne rahein.
//
// `cgl.` prefix se ye tablet par bhi pahunch jati hai — tablet par overlay
// nahi chalta, par wahan bhi ye question aam list se hat jaane chahiye.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.under40";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = storeGet(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function getUnder40() { return new Set(read()); }

// Overlay ki poori list — usi ko sach maan kar likh dete hain. Wahan se koi
// question wapas nikala jaye (file hataayi jaye) to yahan se bhi nikal jayega.
// -> true jab kuch badla
export function setUnder40(qids) {
  const next = [...new Set((qids || []).map(String).filter(Boolean))].sort();
  const prev = read();
  if (prev.length === next.length && prev.every((q, i) => q === next[i])) return false;
  try { storeSet(KEY, JSON.stringify(next)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:under40-changed")); } catch { /* SSR */ }
  return true;
}
