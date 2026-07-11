"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { randomCalcQuestion, calcTypeLabel } from "@/lib/calc";

const CFG_KEY = "cgl.calcrush";
const DEFAULT_CFG = { enabled: false, intervalMin: 30 };

function getCfg() {
  if (typeof window === "undefined") return DEFAULT_CFG;
  try { const raw = localStorage.getItem(CFG_KEY); return raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG; }
  catch { return DEFAULT_CFG; }
}
function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

export default function CalcRush() {
  const [cfg, setCfgState] = useState(DEFAULT_CFG);
  const [panel, setPanel] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const timer = useRef(null);
  const fabRef = useRef(null);

  useEffect(() => { setCfgState(getCfg()); }, []);

  // close the config panel when clicking outside it
  useEffect(() => {
    if (!panel) return;
    const onDown = (e) => { if (fabRef.current && !fabRef.current.contains(e.target)) setPanel(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [panel]);

  const trigger = () => { setQ(randomCalcQuestion()); setPicked(null); setOpen(true); };

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!cfg.enabled) return;
    timer.current = setInterval(trigger, Math.max(1, cfg.intervalMin) * 60 * 1000);
    return () => timer.current && clearInterval(timer.current);
  }, [cfg.enabled, cfg.intervalMin]);

  const update = (patch) => { const next = { ...cfg, ...patch }; setCfgState(next); setCfg(next); };

  return (
    <>
      <div className="rush-fab rush-fab--left" ref={fabRef}>
        {panel && (
          <div className="rush-panel">
            <div className="row between">
              <strong style={{ fontSize: "0.9rem" }}>🧮 Calc Booster</strong>
              <button className="btn btn--ghost btn--sm" onClick={() => setPanel(false)}>✕</button>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", margin: "6px 0 10px" }}>
              Quick speed-maths quizzes — get faster at calculation!
            </p>
            <label className="rush-row">
              <span>Auto pop-up</span>
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
            </label>
            <label className="rush-row">
              <span>Har</span>
              <select className="select" style={{ width: "auto", padding: "6px 10px" }}
                value={cfg.intervalMin} onChange={(e) => update({ intervalMin: parseInt(e.target.value) })}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
              </select>
            </label>
            <button className="btn btn--primary btn--block mt-8" onClick={trigger}>Quick question</button>
            <Link href="/calculation" className="btn btn--ghost btn--block mt-8" onClick={() => setPanel(false)}>Full drill →</Link>
          </div>
        )}
        <button className="rush-btn rush-btn--calc" onClick={() => setPanel((v) => !v)} title="Calculation Booster">🧮</button>
      </div>

      {open && q && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="row between">
              <span className="badge badge--ok">🧮 {calcTypeLabel(q.type)}</span>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>✕</button>
            </div>
            <h3 style={{ marginTop: 14, fontSize: "1.3rem" }}>{q.question}</h3>
            <div className="grid" style={{ gap: 10, marginTop: 16 }}>
              {q.options.map((opt, oi) => {
                const s = {
                  textAlign: "left", padding: "12px 14px", borderRadius: 10,
                  borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
                  background: "rgba(0,0,0,0.2)", color: "var(--text-1)", cursor: picked === null ? "pointer" : "default",
                };
                if (picked !== null) {
                  if (oi === q.answer) { s.borderColor = "rgba(52,211,153,0.7)"; s.background = "rgba(52,211,153,0.14)"; }
                  else if (oi === picked) { s.borderColor = "rgba(251,113,133,0.7)"; s.background = "rgba(251,113,133,0.14)"; }
                }
                return (
                  <button key={oi} style={s} onClick={() => picked === null && setPicked(oi)}>
                    <strong style={{ opacity: 0.7, marginRight: 8 }}>{String.fromCharCode(65 + oi)}</strong>{opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="row between mt-16">
                <span style={{ color: picked === q.answer ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                  {picked === q.answer ? "Correct! ✅" : `Wrong ❌ — ${q.options[q.answer]}`}
                </span>
                <button className="btn btn--primary btn--sm" onClick={trigger}>Next →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
