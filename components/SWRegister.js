"use client";

import { useEffect } from "react";

// Service worker register karta hai — aur jaan-boojh kar sirf production mein.
//
// Dev mein register karte to Next ke hashed chunks cache mein atak jate aur
// code badalne par bhi purana chalta rehta — ghanton dhoondhne wali dikkat.
// SW waise bhi HTTPS (ya localhost) maangta hai, to LAN IP wale dev server par
// register hota hi nahi.
//
// ?sw=off escape hatch: tablet par devtools nahi hote, aur atka hua SW hataana
// warna genuinely painful hai.
export default function SWRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (new URLSearchParams(window.location.search).get("sw") === "off") {
      navigator.serviceWorker.getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
      return;
    }

    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);

  return null;
}
