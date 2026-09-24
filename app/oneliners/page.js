"use client";

// 📝 One-liners — overlay ke 📝 button se aayi ek-line notes.
//
// Fact log aur Zaroori baatein se alag rakha gaya hai (owner: "fact log mein
// mt bhej .. alag page bna"). Yahan revision ka chakkar nahi chalta — sirf
// ginti wali list hai: kisi bhi line par click karo, wo popup mein poori
// khulti hai, aur wahin se ← pichli / agli → chalti rehti hai.
//
// Har line ab markdown se banti hai (components/Markdown) — wahi renderer jo
// answers page par hai. AI ka jawab bold aur LaTeX ke saath aata hai; pehle
// yahan wo kachcha dikhta tha ("Neither of the two boys **is** guilty"),
// yaani jis shabd par zor dena tha wahi taaron mein dab jata tha.

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import {
  getOneLiners, removeOneLiner, clearOneLiners, olLines, olTitle, isTrickLine, subOf, OL_SUBS,
} from "@/lib/oneliners";

function when(at) {
  if (!at) return "";
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Ek one-liner poora — jaise Gemini ne diya tha, line dar line. Aakhri "🧠
// Yaad rakhne ki trick" apne khane mein, kyunki asli kaam usi ka hai.
function OneLinerPopup({ item, position, hasPrev, hasNext, onPrev, onNext, onClose, onDelete }) {
  const s = subOf(item.subject);
  const lines = olLines(item.text);

  // Arrow se list mein chalo, Esc se band. Likhte waqt nahi — peeche wala
  // dhoondne ka box apne arrow keys rakhta hai.
  useEffect(() => {
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 500 }}>
      <div className="modal glass pocket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pocket-modal__bar">
          <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
            <div>
              <span className="hero__eyebrow">{s.icon} {s.label} · 📝 one-liner</span>
              <h2 style={{ marginTop: 4, fontSize: "1.15rem" }}>
                {position} <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 400 }}>· {when(item.at)}</span>
              </h2>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <button className="btn btn--ghost btn--sm" onClick={onPrev} disabled={!hasPrev} title="Pichli (←)">←</button>
              <button className="btn btn--ghost btn--sm" onClick={onNext} disabled={!hasNext} title="Agli (→)">→</button>
              <button className="btn btn--ghost btn--sm" onClick={onDelete} title="Hata do">🗑️</button>
              <button className="btn btn--ghost btn--sm" onClick={onClose} title="Band (Esc)">✕</button>
            </div>
          </div>
        </div>

        <div className="pocket-modal__body">
          <div className="answer-box">
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {lines.filter((l) => !isTrickLine(l)).map((l, i) => (
                <li key={i} style={{ fontSize: "1.02rem", lineHeight: 1.6 }}>
                  <Markdown inline>{l.replace(/^\d+[.)]\s*/, "")}</Markdown>
                </li>
              ))}
            </ul>
          </div>
          {lines.filter(isTrickLine).map((l, i) => (
            <div key={i} className="answer-box mt-8" style={{ borderColor: "var(--accent)" }}>
              <span style={{ fontSize: "1.02rem", lineHeight: 1.6 }}><Markdown inline>{l}</Markdown></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OneLinersPage() {
  const [all, setAll] = useState([]);
  const [sub, setSub] = useState("all");
  const [q, setQ] = useState("");
  const [at, setAt] = useState(-1);      // popup mein kaunsi line khuli hai

  const load = () => setAll(getOneLiners());
  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener("cgl:oneliners-changed", on);   // overlay se nayi line
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:oneliners-changed", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((o) => (sub === "all" || o.subject === sub)
      && (!t || o.text.toLowerCase().includes(t)));
  }, [all, sub, q]);

  // Hatane ke baad popup wahin rehta hai — agli line us jagah aa jati hai,
  // aur aakhri thi to pichli par chala jata hai.
  const drop = (id, fromPopup) => {
    removeOneLiner(id);
    const left = shown.length - 1;
    if (fromPopup) setAt((i) => (left <= 0 ? -1 : Math.min(i, left - 1)));
    load();
  };

  const open = at >= 0 && at < shown.length ? shown[at] : null;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">📝 One-liners</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Ek question, <span className="grad">ek line</span>
        </h1>
        <p className="hero__sub">
          Overlay par answer copy karne ke baad 📝 dabate ho — usi chat se nikli chhoti line
          yahan aa jati hai. Kisi bhi line par click karo: poori popup mein khulegi, aur wahin
          se ← → karke saari padh sakte ho.
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="subj-row" style={{ marginBottom: 12 }}>
          <button className={`subj-chip${sub === "all" ? " is-active" : ""}`} onClick={() => { setSub("all"); setAt(-1); }}>
            📝 Sab · {all.length}
          </button>
          {OL_SUBS.map((s) => {
            const n = all.filter((o) => o.subject === s.k).length;
            if (!n) return null;
            return (
              <button key={s.k} className={`subj-chip${sub === s.k ? " is-active" : ""}`} onClick={() => { setSub(s.k); setAt(-1); }}>
                {s.icon} {s.label} · {n}
              </button>
            );
          })}
        </div>

        <div className="row between ms-form" style={{ marginBottom: 8 }}>
          <h2 className="ms-h2" style={{ margin: 0 }}>Saari lines ({shown.length})</h2>
          {all.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { if (confirm(`Saari ${all.length} one-liners hamesha ke liye hat jayengi. Pakka?`)) { clearOneLiners(); setAt(-1); load(); } }}
            >🗑️ Sab hatao</button>
          )}
          <input className="input" style={{ maxWidth: 220 }} value={q} onChange={(e) => { setQ(e.target.value); setAt(-1); }} placeholder="🔎 dhoondo" />
        </div>

        {shown.length === 0 ? (
          <div className="placeholder">
            {all.length === 0
              ? "Abhi koi one-liner nahi. Overlay par subject ka answer copy karne ke baad 📝 dabao."
              : "Is chhaan-been mein kuch nahi mila."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {shown.map((o, i) => {
              const s = subOf(o.subject);
              const n = olLines(o.text).length;
              return (
                <div key={o.id} className="glass-card ms-factrow" style={{ alignItems: "center" }}>
                  <button
                    onClick={() => setAt(i)}
                    style={{
                      background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer",
                      color: "inherit", font: "inherit", display: "flex", gap: 8, minWidth: 0, flex: 1,
                    }}
                  >
                    <span className="muted" style={{ fontSize: "0.85rem", minWidth: 24 }}>{i + 1}.</span>
                    <span style={{ minWidth: 0 }}>
                      {s.icon} <Markdown inline>{olTitle(o)}</Markdown>
                      {n > 1 && <span className="muted" style={{ fontSize: "0.8rem" }}> · {n} line</span>}
                    </span>
                  </button>
                  <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <span className="hint">{when(o.at)}</span>
                    <button className="btn btn--ghost btn--sm" onClick={() => drop(o.id, false)} title="Hata do">🗑️</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {open && (
        <OneLinerPopup
          key={open.id}
          item={open}
          position={`${at + 1} / ${shown.length}`}
          hasPrev={at > 0}
          hasNext={at < shown.length - 1}
          onPrev={() => setAt((i) => Math.max(0, i - 1))}
          onNext={() => setAt((i) => Math.min(shown.length - 1, i + 1))}
          onClose={() => setAt(-1)}
          onDelete={() => drop(open.id, true)}
        />
      )}
    </>
  );
}
