"use client";

// 🩹 Likhne wale device (tablet, lib/inkdevice) par: writing / ⭐ IMP jo device
// par hai par record par uska pata nahi pahuncha — apne aap dobara upload
// (lib/ink healInk). Site khulte hi (thodi der baad) aur har sync ke baad.

import { useEffect } from "react";
import { healInk } from "@/lib/ink";
import { inkRecord, inkSetter } from "@/lib/impink";
import { isInkWriter } from "@/lib/inkdevice";

export default function InkHeal() {
  useEffect(() => {
    if (!isInkWriter()) return undefined;
    let busy = false;
    let t = null;
    const run = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        if (busy) return;
        busy = true;
        try { await healInk(inkRecord, inkSetter); } catch { /* agli baar */ }
        busy = false;
      }, 4000);
    };
    run();
    window.addEventListener("cgl:sync-applied", run);
    window.addEventListener("online", run);
    return () => {
      clearTimeout(t);
      window.removeEventListener("cgl:sync-applied", run);
      window.removeEventListener("online", run);
    };
  }, []);
  return null;
}
