"use client";

// App ka data IndexedDB (lib/bigstore) mein hai — aur IDB async hai. Pages
// synchronously padhte hain, isliye pehle store hydrate hone do, tabhi UI
// dikhao; warna pehli render par "kuch nahi hai" flash hota.
//
// Server aur pehli client render — dono par placeholder aata hai, isliye koi
// hydration mismatch nahi. Safety timeout: IDB kabhi atak jaye to bhi app
// khulti hai (bigstore khud localStorage par gir jata hai).

import { useEffect, useState } from "react";
import { hydrateStore, storeFlush } from "@/lib/bigstore";
import { runOneTimeReset, clearOldGeminiPrompt } from "@/lib/resetonce";

export default function StoreGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    // Safaya sirf hydrate POORA hone par. Pehle chalate to khaali cache par
    // likhte aur IDB se purana data uske baad wapas aa jata. Safety timeout ise
    // nahi chalata — wo sirf UI kholta hai.
    hydrateStore()
      .then(() => { runOneTimeReset(); clearOldGeminiPrompt(); })
      .catch(() => {})
      .finally(finish);
    const t = setTimeout(finish, 2000);
    // Tab band/hide hote waqt pending writes turant likh do.
    const flush = () => { storeFlush(); };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  if (!ready) return <div className="placeholder" style={{ margin: 24 }}>…</div>;
  return <>{children}</>;
}
