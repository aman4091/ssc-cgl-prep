"use client";

import { useEffect, useState } from "react";
import { vocabDetail } from "@/lib/client-ai";
import { getDetail, setDetail, addEntry, TYPES } from "@/lib/vocab";

export default function WordPopup({ word, onClose }) {
  const [cur, setCur] = useState(word);
  const [detail, setDet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState("");

  useEffect(() => { setCur(word); }, [word]);

  useEffect(() => {
    if (!cur) return;
    setError(""); setAdded(""); setDet(null);
    const cached = getDetail(cur);
    if (cached) { setDet(cached); return; }
    let alive = true;
    setLoading(true);
    vocabDetail(cur, "")
      .then((d) => { if (alive) { setDetail(cur, d); setDet(d); } })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [cur]);

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
          <button className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
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
