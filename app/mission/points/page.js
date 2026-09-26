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

import "@/app/carev.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPoints, removePoint, clearPoints } from "@/lib/sscpoints";
import { clearSession } from "@/lib/recallsession";
import Recall from "@/components/carevision/Recall";
import TrickButtons from "@/components/TrickButtons";

const LABELS = { bad: "Nahi aata tha", good: "Aata tha", show: "Dikhao" };
// Ek card = ek jawab ki saari baatein (ek record). Sar par uska topic, aur
// neeche ek-ek baat apni line par — Recall wahi " · " / nayi line wali
// list bana deta hai.

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toCard(p) {
  return {
    id: p.id,
    trigger: p.topic || p.src || "Zaroori baatein",
    answer: p.lines.join("\n"),
    extra: null,
    pdfPage: null,
    meta: `🎯 ${p.topic || "SSC"}${p.src ? ` · ${p.src}` : ""}${p.lines.length > 1 ? ` · ${p.lines.length} baat` : ""}`,
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
    return t ? points.filter((p) => `${p.topic} ${p.lines.join(" ")}`.toLowerCase().includes(t)) : points;
  }, [points, q]);

  if (revising) {
    return (
      <Recall
        queue={revising}
        labels={LABELS}
        open
        loop
        onRate={() => {}}
        tools={(c) => <TrickButtons card={c} subject="gs" />}
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
          <h2 className="ms-h2" style={{ margin: 0 }}>
            Saari baatein ({points.reduce((n, p) => n + p.lines.length, 0)})
          </h2>
          {points.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { if (confirm("Saari baatein hat jayengi. Pakka?")) { clearPoints(); load(); } }}
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
              <div key={p.id} className="glass-card ms-group">
                <div className="row between" style={{ gap: 8, flexWrap: "nowrap" }}>
                  <strong style={{ fontSize: "0.9rem" }}>
                    🎯 {p.topic || p.src || "Zaroori baatein"}
                    <span className="muted"> · {p.lines.length}</span>
                  </strong>
                  <button className="btn btn--ghost btn--sm" onClick={() => { removePoint(p.id); load(); }}>🗑️</button>
                </div>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 5 }}>
                  {p.lines.map((l, i) => (
                    <li key={i} style={{ fontSize: "0.92rem", lineHeight: 1.5 }}>{l}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
