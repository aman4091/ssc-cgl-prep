"use client";

import { useEffect, useRef, useState } from "react";
import { randomCurrentAffairsQuestion, getCurrentAffairsQuestions } from "@/lib/feed";
import { addReview } from "@/lib/qreview";
import AskButtons from "@/components/AskButtons";

const CFG_KEY = "cgl.carush";
const DEFAULT_CFG = { enabled: false, intervalMin: 60 };

function getCfg() {
  if (typeof window === "undefined") return DEFAULT_CFG;
  try { const raw = localStorage.getItem(CFG_KEY); return raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG; }
  catch { return DEFAULT_CFG; }
}
function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

export default function CurrentAffairsRush() {
  const [cfg, setCfgState] = useState(DEFAULT_CFG);
  const [hasQ, setHasQ] = useState(false);
  const [panel, setPanel] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const timer = useRef(null);
  const advanceRef = useRef(null);
  const fabRef = useRef(null);

  useEffect(() => {
    setCfgState(getCfg());
    setHasQ(getCurrentAffairsQuestions().length >= 1);
  }, []);

  // close the config panel when clicking outside it
  useEffect(() => {
    if (!panel) return;
    const onDown = (e) => { if (fabRef.current && !fabRef.current.contains(e.target)) setPanel(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [panel]);

  const trigger = () => {
    const next = randomCurrentAffairsQuestion();
    if (!next) return;
    if (advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null; }
    setQ(next); setPicked(null); setOpen(true);
  };

  // Pick an answer -> record to the Mistake Notebook -> brief feedback -> next.
  const choose = (oi) => {
    if (picked !== null) return;
    setPicked(oi);
    addReview(q, { source: "ca-rush", category: "Current Affairs", correct: oi === q.answer });
    if (advanceRef.current) clearTimeout(advanceRef.current);
    const delay = oi === q.answer ? 1000 : 1800;
    advanceRef.current = setTimeout(() => trigger(), delay);
  };

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!cfg.enabled || !hasQ) return;
    timer.current = setInterval(trigger, Math.max(1, cfg.intervalMin) * 60 * 1000);
    return () => timer.current && clearInterval(timer.current);
  }, [cfg.enabled, cfg.intervalMin, hasQ]);

  useEffect(() => {
    if (!open && advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null; }
  }, [open]);
  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  const update = (patch) => { const next = { ...cfg, ...patch }; setCfgState(next); setCfg(next); };

  if (!hasQ) return null;

  return (
    <>
      <div className="rush-fab rush-fab--stack" ref={fabRef}>
        {panel && (
          <div className="rush-panel">
            <div className="row between">
              <strong style={{ fontSize: "0.9rem" }}>📰 Current Affairs Rush</strong>
              <button className="btn btn--ghost btn--sm" onClick={() => setPanel(false)}>✕</button>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", margin: "6px 0 10px" }}>
              Random current-affairs question every so often — keeps facts fresh!
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
                <option value={120}>2 hours</option>
              </select>
            </label>
            <button className="btn btn--primary btn--block mt-8" onClick={trigger}>Quiz now</button>
          </div>
        )}
        <button className="rush-btn rush-btn--ca" onClick={() => setPanel((v) => !v)} title="Current Affairs Rush">📰</button>
      </div>

      {open && q && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="row between">
              <span className="badge badge--ok">📰 Current Affairs</span>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>✕</button>
            </div>
            <h3 style={{ marginTop: 14, fontSize: "1.05rem" }}>{q.question}</h3>
            <div className="grid" style={{ gap: 10, marginTop: 16 }}>
              {q.options.map((opt, oi) => {
                const s = {
                  textAlign: "left", padding: "12px 14px", borderRadius: 10,
                  borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
                  background: "var(--bg)", color: "var(--text-1)", cursor: picked === null ? "pointer" : "default",
                };
                if (picked !== null) {
                  if (oi === q.answer) { s.borderColor = "rgba(107,211,154,0.7)"; s.background = "rgba(107,211,154,0.14)"; }
                  else if (oi === picked) { s.borderColor = "rgba(255,138,122,0.7)"; s.background = "rgba(255,138,122,0.14)"; }
                }
                return (
                  <button key={oi} style={s} onClick={() => choose(oi)}>
                    <strong style={{ opacity: 0.7, marginRight: 8 }}>{String.fromCharCode(65 + oi)}</strong>{opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="center mt-16">
                <span style={{ color: picked === q.answer ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                  {picked === q.answer ? "Correct! ✅" : `Wrong ❌ — ${q.options[q.answer]}`}
                </span>
                {q.explanation && <p className="muted mt-8" style={{ fontSize: "0.82rem" }}>{q.explanation}</p>}
              </div>
            )}
            <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <AskButtons q={q} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
