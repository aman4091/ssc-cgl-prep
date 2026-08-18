"use client";

import { useEffect, useRef } from "react";
import { getSettings } from "@/lib/storage";
import { syncReady, syncOnce, remoteInfo, localHash, isSyncPaused } from "@/lib/sync";

// Fully automatic cloud sync — no buttons.
//
// Pehle yahan faisla hota tha ki "kaun jeetega": local badla ho to PUSH (poora
// snapshot replace), warna PULL. Wahi faisla data khata tha — thoda purana device
// bhi khud ko sahi maan kar doosre ka naya data uda deta.
//
// Ab yahan koi faisla hai hi nahi. Ek hi kaam hai — `syncOnce()` — jo dono taraf
// ka data key-by-key JOD deta hai (lib/sync.js). Is component ka kaam sirf itna
// hai: sahi waqt par bulao, aur bekaar mein network mat chhuo.
export default function SyncManager() {
  const busy = useRef(false);
  const wantReload = useRef(false);

  useEffect(() => {
    let stopped = false;
    // isSyncPaused: solve/pen view khula ho to bhaari hash/stringify ke beech
    // mein nahi chalna chahiye (nib ruk jati hai).
    const active = () => getSettings().syncAuto && syncReady() && !isSyncPaused();

    // Reload tabhi jab user kuch likh na raha ho — warna adha type kiya hua
    // gayab ho jata hai. Ruk gaye to agli cycle par ho jayega; data to already
    // storage mein likha ja chuka hai, sirf screen purani hai.
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
        const s = getSettings();
        const dirty = localHash() !== (s.syncPushedHash || "");
        const remoteAt = await remoteInfo();
        const remoteNew = (remoteAt || "") !== (s.syncRemoteAt || "");
        // Dono taraf kuch nahi badla — poora data kheenchne ka koi matlab nahi.
        if (!dirty && !remoteNew) return;
        const r = await syncOnce();
        if (r.applied) reloadIfIdle();
      } catch { /* offline / race — agli cycle par phir */ }
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
