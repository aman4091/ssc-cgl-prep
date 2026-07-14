"use client";

import { useEffect, useRef } from "react";
import { getSettings } from "@/lib/storage";
import { syncReady, pushSync, pullSync } from "@/lib/sync";

// Headless: when auto-sync is on, pull once per session on load, then push every
// couple minutes and when the tab is hidden. Last-write-wins by updated_at.
export default function SyncManager() {
  const pushing = useRef(false);

  useEffect(() => {
    if (!getSettings().syncAuto || !syncReady()) return;

    // pull once per browser session (reload so mounted pages pick up new data)
    try {
      if (!sessionStorage.getItem("cgl.sync.pulled")) {
        sessionStorage.setItem("cgl.sync.pulled", "1");
        pullSync().then((t) => { if (t) window.location.reload(); }).catch(() => {});
      }
    } catch { /* ignore */ }

    const doPush = () => {
      if (pushing.current || !getSettings().syncAuto || !syncReady()) return;
      pushing.current = true;
      pushSync().catch(() => {}).finally(() => { pushing.current = false; });
    };
    const iv = setInterval(doPush, 2 * 60 * 1000);
    const onHide = () => { if (document.visibilityState === "hidden") doPush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onHide); };
  }, []);

  return null;
}
