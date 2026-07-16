"use client";

import { useEffect, useRef, useState } from "react";
import { randomMcqFromDays, getOws } from "@/lib/vocab";
import { getSettings } from "@/lib/storage";
import { addReview } from "@/lib/qreview";
import AskButtons from "@/components/AskButtons";

const CFG_KEY = "cgl.rush";
const DEFAULT_CFG = { enabled: true, intervalMin: 60 };

function getCfg() {
  if (typeof window === "undefined") return DEFAULT_CFG;
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG;
  } catch { return DEFAULT_CFG; }
}
function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

export default function VocabRush() {
  const [cfg, setCfgState] = useState(DEFAULT_CFG);
  const [hasWords, setHasWords] = useState(false);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [mcq, setMcq] = useState(null);
  const [picked, setPicked] = useState(null);
  const timer = useRef(null);
  const advanceRef = useRef(null);
  const fabRef = useRef(null);

  // close the config panel when clicking anywhere outside it
  useEffect(() => {
    if (!panel) return;
    const onDown = (e) => { if (fabRef.current && !fabRef.current.contains(e.target)) setPanel(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [panel]);

  useEffect(() => {
    setCfgState(getCfg());
    setHasWords(getOws().length >= 4);
  }, []);

  const trigger = () => {
    const q = randomMcqFromDays(getSettings().vocabRushDays);
    if (!q) return;
    if (advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null; }
    setMcq(q);
    setPicked(null);
    setOpen(true);
  };

  // Pick an answer -> show feedback briefly -> auto-advance to the next question.
  const choose = (oi) => {
    if (picked !== null) return;
    setPicked(oi);
    addReview(mcq, { source: "vocab-rush", category: "Vocab", correct: oi === mcq.answer });
    if (advanceRef.current) clearTimeout(advanceRef.current);
    const delay = oi === mcq.answer ? 900 : 1500; // linger longer when wrong
    advanceRef.current = setTimeout(() => trigger(), delay);
  };

  // cancel any pending auto-advance when the overlay closes / unmounts
  useEffect(() => {
    if (!open && advanceRef.current) { clearTimeout(advanceRef.current); advanceRef.current = null; }
  }, [open]);
  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  // schedule recurring rush
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!cfg.enabled || !hasWords) return;
    timer.current = setInterval(trigger, Math.max(1, cfg.intervalMin) * 60 * 1000);
    return () => timer.current && clearInterval(timer.current);
  }, [cfg.enabled, cfg.intervalMin, hasWords]);

  const update = (patch) => {
    const next = { ...cfg, ...patch };
    setCfgState(next);
    setCfg(next);
  };

  if (!hasWords) return null;

  return (
    <>
      {/* Floating control */}
      <div className="rush-fab" ref={fabRef}>
        {panel && (
          <div className="rush-panel">
            <div className="row between">
              <strong style={{ fontSize: "0.9rem" }}>⚡ Vocab Rush</strong>
              <button className="btn btn--ghost btn--sm" onClick={() => setPanel(false)}>✕</button>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", margin: "6px 0 10px" }}>
              A random vocab quiz every so often — locks words into memory!
            </p>
            <label className="rush-row">
              <span>Auto quiz</span>
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
        <button className="rush-btn" onClick={() => setPanel((v) => !v)} title="Vocab Rush">⚡</button>
      </div>

      {/* Rush quiz overlay */}
      {open && mcq && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="row between">
              <span className="badge badge--ok">⚡ Vocab Rush</span>
              <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>✕</button>
            </div>
            <h3 style={{ marginTop: 14, fontSize: "1.05rem" }}>{mcq.question}</h3>
            <div className="grid" style={{ gap: 10, marginTop: 16 }}>
              {mcq.options.map((opt, oi) => {
                const s = {
                  textAlign: "left", padding: "12px 14px", borderRadius: 10,
                  borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
                  background: "var(--bg)", color: "var(--text-1)", cursor: picked === null ? "pointer" : "default",
                };
                if (picked !== null) {
                  if (oi === mcq.answer) { s.borderColor = "rgba(107,211,154,0.7)"; s.background = "rgba(107,211,154,0.14)"; }
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
                <span style={{ color: picked === mcq.answer ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                  {picked === mcq.answer ? "Correct! ✅" : `Wrong ❌ — correct: ${mcq.options[mcq.answer]}`}
                </span>
              </div>
            )}
            <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <AskButtons q={mcq} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
