"use client";

// Settings → 📰 Current Affairs Rush: floating button dikhana/chhupana.
// (Config cgl.carush me hai — sync ke saath har device par.)

import { useEffect, useState } from "react";

const CFG_KEY = "cgl.carush";

export default function CaRushSetting() {
  const [cfg, setCfgState] = useState(null);
  useEffect(() => {
    try { setCfgState({ enabled: false, intervalMin: 60, ...(JSON.parse(localStorage.getItem(CFG_KEY) || "{}")) }); }
    catch { setCfgState({ enabled: false, intervalMin: 60 }); }
  }, []);
  if (!cfg) return null;

  const update = (patch) => {
    const next = { ...cfg, ...patch };
    setCfgState(next);
    try { localStorage.setItem(CFG_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const showFab = !cfg.hideFab;

  return (
    <section className="section" style={{ maxWidth: 640 }}>
      <div className="glass-card">
        <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
          <div>
            <h3>📰 Current Affairs Rush</h3>
            <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
              Floating 📰 button (jo CA questions hone par niche-right dikhta hai) aur uska
              auto pop-up quiz. Button band karoge to pop-up bhi nahi aayega.
            </p>
          </div>
          <button
            className={`toggle ${showFab ? "is-on" : ""}`}
            role="switch"
            aria-checked={showFab}
            onClick={() => update({ hideFab: showFab })}
          >
            <span className="toggle__knob" />
            <span className="toggle__txt">{showFab ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
