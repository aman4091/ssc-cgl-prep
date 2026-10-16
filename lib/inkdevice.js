// ✍️ Stylus ki writing sirf TABLET par likhi / mitayi jati hai (owner: "jo
// tablet mein likhunga ya hataunga bas vo hi final hai — kisi aur device par
// read view"). PC / phone par writing page sirf dekhne ke liye.
//
// Tablet apne aap pehchana jata hai: ungli wali screen (pointer: coarse) aur
// chhoti side kam se kam 600px — phone isse chhote, PC par mouse. Galat pehchaan
// ho to device par haath se: localStorage "ink.writer" = "1" (likhne wala) /
// "0" (sirf dekhne wala) — ye sync nahi hota, har device ki apni.

const KEY = "ink.writer";

export function isInkWriter() {
  if (typeof window === "undefined") return false;
  try {
    const o = localStorage.getItem(KEY);
    if (o === "1") return true;
    if (o === "0") return false;
  } catch { /* ignore */ }
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const short = Math.min(window.screen?.width || 0, window.screen?.height || 0);
    return coarse && short >= 600;
  } catch { return false; }
}

export function setInkWriter(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ignore */ }
}
