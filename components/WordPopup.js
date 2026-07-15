"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vocabDetail } from "@/lib/client-ai";
import { getDetail, setDetail, clearDetail, addEntry, TYPES } from "@/lib/vocab";

export default function WordPopup({ word, onClose }) {
  const [cur, setCur] = useState(word);
  const [detail, setDet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");
  const reqRef = useRef(0);   // only the newest request may write state

  useEffect(() => { setCur(word); }, [word]);

  // force = skip the cache and re-ask the AI (the 🔄 button).
  const load = useCallback(async (w, force) => {
    if (!w) return;
    const token = ++reqRef.current;
    setError(""); setAdded(""); setDet(null);
    if (force) clearDetail(w);
    else {
      const cached = getDetail(w);
      if (cached) { setDet(cached); return; }
    }
    setLoading(true);
    try {
      const d = await vocabDetail(w, "");
      if (token !== reqRef.current) return;
      if (String(d?.meaning || "").trim()) { setDetail(w, d); setDet(d); }
      else setError("Meaning nahi aaya — 🔄 dabaa ke dobara try karo.");
    } catch (e) {
      if (token === reqRef.current) setError(e.message);
    } finally {
      if (token === reqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(cur, false); }, [cur, load]);

  if (!word) return null;

  const add = (type) => {
    addEntry(cur, detail?.meaning || "", type);
    setAdded(type);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 500 }}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="row between">
          <h2 className="grad" style={{ fontSize: "1.5rem" }}>{cur}</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => load(cur, true)} disabled={loading} title="Meaning dobara laao">
              {loading ? "⏳" : "🔄"}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading && <p className="mt-16" style={{ color: "var(--accent-2)" }}>Loading…</p>}
        {error && <p className="mt-16" style={{ color: "var(--danger)" }}>{error}</p>}

        {detail && !loading && (
          <div className="mt-16" style={{ display: "grid", gap: 12 }}>
            {detail.meaning && <div><span className="vd-label">Meaning</span><p>{detail.meaning}</p></div>}
            {detail.trick && <div><span className="vd-label">💡 Trick</span><p>{detail.trick}</p></div>}
            {detail.example && <div><span className="vd-label">Example</span><p style={{ fontStyle: "italic" }}>{detail.example}</p></div>}
            {detail.synonyms?.length > 0 && (
              <div><span className="vd-label">Synonyms</span>
                <div className="chips">{detail.synonyms.map((s, i) => (
                  <button key={i} className="chip chip--syn chip--btn" onClick={() => setCur(s)}>{s}</button>
                ))}</div>
              </div>
            )}
            {detail.antonyms?.length > 0 && (
              <div><span className="vd-label">Antonyms</span>
                <div className="chips">{detail.antonyms.map((s, i) => (
                  <button key={i} className="chip chip--ant chip--btn" onClick={() => setCur(s)}>{s}</button>
                ))}</div>
              </div>
            )}
          </div>
        )}

        {/* Add to store */}
        <div className="mt-24">
          <span className="vd-label">Add this word</span>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            {TYPES.map((t) => (
              <button key={t.key} className="btn btn--ghost btn--sm" onClick={() => add(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {added && <p style={{ color: "var(--success)", fontSize: "0.85rem", marginTop: 8 }}>✔ "{cur}" added to {added.toUpperCase()}.</p>}
        </div>
      </div>
    </div>
  );
}
