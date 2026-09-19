"use client";

// 🎯 Zaroori baatein — CA / PYQ ke jawabon se uthayi hui ek-line baatein.
//
// Fact log (/mission/facts) cluster ke liye hai — "Kerala ke saare dance ek
// line mein". Ye uska chhota bhai hai: har baat apni alag line, bilkul
// waise jaise answer mein aati hai (owner: "one liner hi rehne dio").
//
// Page kholte hi seedha revision, fact log ki tarah: upar baat, neeche
// "Aata tha / Nahi aata tha". Nahi aata tha wali baat usi round mein phir
// aati hai, har baar thoda aur door (3, 4, 5 … card baad). Bahar nikalte hi
// poori list — dhoondo, hatao, saaf karo.

import "@/app/ca-revision/carev.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPoints, removePoint, clearPoints } from "@/lib/sscpoints";
import { clearSession } from "@/lib/recallsession";
import Recall from "@/components/carevision/Recall";

const LABELS = { bad: "Nahi aata tha", good: "Aata tha", show: "Dikhao" };
// "naam — baaki" ki shakl: ':' / '—' / '–' / '=' / '→' / ' - ' se pehle ka
// hissa upar, baad wala neeche. Na mile to topic hi sar hai.
const SPLIT = /^(.{3,90}?)\s*(?::|—|–|=|→|\s-\s)\s*([\s\S]{2,})$/;

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toCard(p) {
  const m = SPLIT.exec(String(p.text).trim());
  return {
    id: p.id,
    trigger: m ? m[1] : (p.topic || "Zaroori baat"),
    answer: m ? m[2] : p.text,
    extra: null,
    pdfPage: null,
    meta: `🎯 ${p.topic || "SSC"}${p.src ? ` · ${p.src}` : ""}`,
  };
}

export default function SscPointsPage() {
  const [points, setPoints] = useState([]);
  const [q, setQ] = useState("");
  const [revising, setRevising] = useState(null);
  const autoStarted = useRef(false);

  const load = () => setPoints(getPoints());
  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener("cgl:points-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:points-changed", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, []);

  // Fact log jaisa: kholte hi revision. Ek hi baar — list par wapas aane ke
  // baad koi load() ise dobara shuru nahi karta.
  useEffect(() => {
    if (autoStarted.current || !points.length) return;
    autoStarted.current = true;
    setRevising(shuffle(points).map(toCard));
  }, [points]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? points.filter((p) => `${p.topic} ${p.text}`.toLowerCase().includes(t)) : points;
  }, [points, q]);

  if (revising) {
    return (
      <Recall
        queue={revising}
        labels={LABELS}
        open
        loop
        onRate={() => {}}
        onDelete={(c) => { removePoint(c.id); load(); }}
        resumeKey="points"
        onExit={() => { setRevising(null); load(); window.scrollTo(0, 0); }}
      />
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🎯 Zaroori baatein</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Ek line, <span className="grad">jaise answer mein aati hai</span>
        </h1>
        <p className="hero__sub">
          CA aur PYQ ke jawab mein jo 🎯 SSC wali baatein aur 📝 one-liner hote hain, wo yahan
          🎯 button se jama hote hain. Har baar sab aate hain — jo aata hai wo us round se hat
          jata hai, jo nahi aata wo baar-baar (3, 4, 5 … baad).
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        {points.length > 0 && (
          <button
            className="btn btn--primary ms-revise-go"
            onClick={() => { clearSession("points"); setRevising(shuffle(points).map(toCard)); }}
          >
            ▶ Naya round shuru karo · {points.length}
          </button>
        )}
        <div className="row between ms-form" style={{ marginBottom: 8, marginTop: 12 }}>
          <h2 className="ms-h2" style={{ margin: 0 }}>Saari baatein ({points.length})</h2>
          {points.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { if (confirm(`Saari ${points.length} baatein hat jayengi. Pakka?`)) { clearPoints(); load(); } }}
            >🗑️ Sab hatao</button>
          )}
          <input className="input" style={{ maxWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 dhoondo" />
        </div>

        {shown.length === 0 ? (
          <div className="placeholder">
            Abhi kuch nahi. Kisi question ka jawab khol kar 🎯 <b>Zaroori baatein</b> dabao.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {shown.map((p) => (
              <div key={p.id} className="ms-factrow">
                <span>🎯 {p.text}</span>
                <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <span className="hint">{p.src || p.topic || ""}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => { removePoint(p.id); load(); }}>🗑️</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
