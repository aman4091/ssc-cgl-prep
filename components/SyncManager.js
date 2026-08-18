"use client";

import { useEffect, useRef } from "react";
import { getSettings } from "@/lib/storage";
import { syncReady, syncOnce, hasRemoteChanges, localHash, isSyncPaused } from "@/lib/sync";

// Apne aap chalne wala sync — koi button nahi.
//
// Pehle yahan faisla hota tha ki "kaun jeetega": local badla ho to PUSH (poora
// snapshot replace), warna PULL. Wahi faisla data khata tha. Ab yahan koi faisla
// hai hi nahi — ek hi kaam hai, `syncOnce()`, jo sirf BADLE HUE records upar
// bhejta hai aur naye records neeche laata hai. Is component ka kaam bas itna
// hai: sahi waqt par bulao, aur bekaar mein network mat chhuo.
export default function SyncManager() {
  const busy = useRef(false);
  const wantReload = useRef(false);

  useEffect(() => {
    let stopped = false;
    // isSyncPaused: solve/pen view khula ho to bhaari kaam ke beech mein nahi
    // chalna chahiye (nib ruk jati hai).
    const active = () => getSettings().syncAuto && syncReady() && !isSyncPaused();

    // Reload tabhi jab user kuch likh na raha ho — warna adha type kiya hua
    // gayab ho jata hai. Ruk gaye to agli cycle par ho jayega; data to storage
    // mein likha ja chuka hai, sirf screen purani hai.
    const reloadIfIdle = () => {
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing || stopped) { wantReload.current = true; return; }
      wantReload.current = false;
      window.location.reload();
    };

    const cycle = async () => {
      if (busy.current || !active() || document.hidden) return;
      if (wantReload.current) { reloadIfIdle(); if (wantReload.current) return; }
      busy.current = true;
      try {
        const dirty = localHash() !== (getSettings().syncPushedHash || "");
        // Dono taraf kuch nahi badla to poora chakkar chalane ka matlab nahi.
        // hasRemoteChanges ek row bhi nahi kheenchta — sirf "kuch hai kya" poochta hai.
        if (!dirty && !(await hasRemoteChanges())) return;
        const r = await syncOnce();
        if (r.applied) reloadIfIdle();
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
