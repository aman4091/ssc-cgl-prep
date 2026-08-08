// "⬇️ Offline" — ek shelf ke questions tablet par utaar lo, taaki bina internet
// ke bhi khulein aur likha ja sake.
//
// Do alag cheezein hain, aur dono chahiye:
//   1. Question ki IMAGES — service worker ke cache mein. Ye cross-origin R2 URLs
//      hain, isliye SW inhe no-cors se laata hai aur opaque response cache karta
//      hai. <img> ko opaque response se koi dikkat nahi.
//   2. INK — device ke IndexedDB mein. Sirf dekh paana kaafi nahi; offline mein
//      likhna bhi chahiye, aur likhne wala hamesha IndexedDB se padhta hai.
//      Iske liye openInk() hi chala dete hain — wo cloud se laakar local copy
//      clean (dirty=false) bana deta hai, bilkul wahi kaam.

import { imagesOf } from "./wrongbook";
import { openInk } from "./ink";

// SW ko URLs bhejo aur uske jawab ka intezaar karo. SW na ho (dev, ya http par
// LAN IP) to chupchaap chhod do — ink phir bhi utar chuki hogi.
function tellSW(urls) {
  return new Promise((resolve) => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw || !urls.length) return resolve(0);
    const ch = new MessageChannel();
    const t = setTimeout(() => resolve(0), 60000);
    ch.port1.onmessage = (e) => {
      if (e.data?.done) { clearTimeout(t); resolve(e.data.cached || 0); }
    };
    sw.postMessage({ type: "PRECACHE_URLS", urls }, [ch.port2]);
  });
}

// -> { images, ink } — kitni cheezein utar payin.
export async function precacheShelf(records, onProgress) {
  const list = records || [];
  const urls = [];
  for (const r of list) {
    for (const im of imagesOf(r)) if (im.url) urls.push(im.url);
  }
  // Solve view ke dono page bhi cache mein aa jayein, warna offline app khulega
  // hi nahi.
  const shell = ["/answers", "/wrong/solve"];

  let done = 0;
  let ink = 0;
  for (const r of list) {
    if (r.inkUrl) {
      try { await openInk(r); ink += 1; } catch { /* offline ya gayab — chhod do */ }
    }
    done += 1;
    onProgress?.(done, list.length);
  }

  const cached = await tellSW([...shell, ...urls]);
  return { images: cached, ink };
}
