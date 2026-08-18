"use client";

import { useEffect, useRef } from "react";
import { getSettings } from "@/lib/storage";
import { syncReady, syncOnce, hasRemoteChanges, localHash, isSyncPaused } from "@/lib/sync";

// Apne aap chalne wala sync — koi button nahi, aur ab koi RELOAD bhi nahi.
//
// Pehle jab doosre device se data aata tha to ye page reload kar deta tha,
// taaki naya data screen par dikhe. Wo galat tha, aur mehnga: quiz ke beech
// reload hote hi saare mark kiye hue answer chale jate the (answers React state
// mein hote hain, storage mein nahi). Koi app quiz ke beech khud reload nahi
// karti — theek baat hai.
//
// Ab data chupchaap storage mein likh diya jata hai aur bas ek event chhod diya
// jata hai. Jo screen khudko refresh karna chahti hai wo sun le; baaki screens
// agli baar khulne par naya data dikha dengi. Kuch khota kabhi nahi — data likha
// ja chuka hota hai.
export default function SyncManager() {
  const busy = useRef(false);

  useEffect(() => {
    let stopped = false;
    // isSyncPaused: quiz/test/pen jaisi screen khuli ho to sync ko storage
    // chhoona hi nahi chahiye.
    const active = () => getSettings().syncAuto && syncReady() && !isSyncPaused();

    const cycle = async () => {
      if (busy.current || !active() || document.hidden) return;
      busy.current = true;
      try {
        const dirty = localHash() !== (getSettings().syncPushedHash || "");
        // Dono taraf kuch nahi badla to poora chakkar chalane ka matlab nahi.
        // hasRemoteChanges ek row bhi nahi kheenchta — sirf "kuch hai kya" poochta hai.
        if (!dirty && !(await hasRemoteChanges())) return;
        const r = await syncOnce();
        if (r.applied && !stopped) {
          window.dispatchEvent(new CustomEvent("cgl:sync-applied", { detail: r }));
        }
      } catch { /* offline / setup baaki — agli cycle par phir */ }
      finally { busy.current = false; }
    };

    // App band/background hone par ek aakhri sync (mobile: app switch / lock).
    const syncOnLeave = async () => {
      if (!active() || busy.current) return;
      if (localHash() === (getSettings().syncPushedHash || "")) return;
      busy.current = true;
      try { await syncOnce(); } catch { /* ignore */ } finally { busy.current = false; }
    };
    const onVis = () => { if (document.hidden) syncOnLeave(); else cycle(); };

    cycle();
    const iv = setInterval(cycle, 45000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", syncOnLeave);
    return () => {
      stopped = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", syncOnLeave);
    };
  }, []);

  return null;
}
