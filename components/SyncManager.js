"use client";

import { useEffect, useRef } from "react";
import { getSettings } from "@/lib/storage";
import { syncReady, pushSync, pullSync, remoteInfo, localHash, isSyncPaused } from "@/lib/sync";

// Fully automatic cloud sync — no manual buttons needed. While auto-sync is on:
//  • if another device pushed newer data → pull it and reload (so it shows up)
//  • if this device's data changed → push it up
// Runs on an interval + whenever the tab/app is focused or backgrounded (mobile).
export default function SyncManager() {
  const busy = useRef(false);

  useEffect(() => {
    let stopped = false;
    // isSyncPaused: solve view khula ho to sync ka bhaari hash/stringify likhne
    // ke beech mein nahi chalna chahiye.
    const active = () => getSettings().syncAuto && syncReady() && !isSyncPaused();

    const cycle = async () => {
      if (busy.current || !active() || document.hidden) return;
      busy.current = true;
      try {
        const s = getSettings();
        // 0) Never synced on this device yet → seed FROM the cloud (don't push over
        //    it). Only if the cloud is empty do we push this device's data up.
        if (!s.syncPushedHash) {
          const remoteAt = await remoteInfo();
          if (remoteAt) { const t = await pullSync(); if (t && !stopped) { window.location.reload(); return; } }
          else { await pushSync(); }
          return;
        }
        // 1) Local changes ALWAYS win first — push them so a target you just added
        //    is never overwritten by an older cloud copy. The push also absorbs the
        //    cloud's pasted meanings/Hinglish; if it pulled any in, reload to show.
        if (localHash() !== s.syncPushedHash) {
          const r = await pushSync();
          if (r && r.absorbed && !stopped) { window.location.reload(); return; }
          return;
        }
        // 2) Local is clean → if another device pushed newer, pull it + reload.
        const remoteAt = await remoteInfo();
        if (remoteAt && remoteAt > (getSettings().syncRemoteAt || "")) {
          const t = await pullSync();
          if (t && !stopped) { window.location.reload(); return; }
        }
      } catch { /* offline / transient — try again next cycle */ }
      finally { busy.current = false; }
    };

    // push immediately when leaving (mobile: app switch / lock fires 'hidden')
    const pushOnLeave = async () => {
      // Never push before this device has SEEDED from the cloud (pulled at least
      // once). A fresh/empty device pushing its snapshot would wipe the live data.
      if (!active() || busy.current || !getSettings().syncPushedHash) return;
      if (localHash() !== (getSettings().syncPushedHash || "")) {
        busy.current = true;
        try { await pushSync(); } catch { /* ignore */ } finally { busy.current = false; }
      }
    };
    const onVis = () => { if (document.hidden) pushOnLeave(); else cycle(); };

    cycle();
    const iv = setInterval(cycle, 45000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", pushOnLeave);
    return () => {
      stopped = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", pushOnLeave);
    };
  }, []);

  return null;
}
