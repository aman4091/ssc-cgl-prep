"use client";

// 🔤 Vocab — COVER METHOD (components/VocabLayouts, roop "11"): word aur
// matlab ki table, ek column dhaka; row dabao to khule.
//
// Din wale words (OWS / Idiom / Vocab) aur khud pakde hue New Words ek saath
// (lib/vocabpool). Upar type ki chhaanti (Sab / OWS / Idiom / Vocab / New).
// Owner ne 15 tareekon mein se Cover method final kiya — baaki tareeke aur
// pehle wala Jodi milao (components/VocabMatch) backup mein hain (backup/README.md).
//
// Purana wala page (import, din, quiz) /vocab/manage par hai.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import VocabLayouts, { VL_TYPES } from "@/components/VocabLayouts";
import "./layouts15.css";
import "./layouts.css";

// Pool A–Z mein aata hai, to "Sab" mein shuru ke saare Idiom ("A bird…",
// "At …") ek saath aa jaate the. Ab type-wise baari-baari: OWS, Idiom,
// Vocab, New, phir OWS… — har type apne A–Z kram mein.
function mixTypes(pool) {
  const by = new Map();
  for (const p of pool) { if (!by.has(p.type)) by.set(p.type, []); by.get(p.type).push(p); }
  const lists = ["ows", "idiom", "vocab", "new", ...[...by.keys()].filter((k) => !["ows", "idiom", "vocab", "new"].includes(k))]
    .map((k) => by.get(k) || []).filter((l) => l.length);
  const out = [];
  for (let i = 0; out.length < pool.length; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

// Kram ek baar ban kar PAKKA — har word ka number refresh ke baad bhi wahi
// (cgl.vocab.order, sync hota hai). Naye word aakhir mein judte hain (wo bhi
// baari-baari), hate hue word list se nikal jaate hain.
const ORDER_KEY = "cgl.vocab.order";
function fixedOrder(pool) {
  let saved = [];
  try { const v = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]"); if (Array.isArray(v)) saved = v; } catch { /* ignore */ }
  const byId = new Map(pool.map((p) => [p.id, p]));
  const kept = saved.filter((id) => byId.has(id));
  const seen = new Set(kept);
  const fresh = mixTypes(pool.filter((p) => !seen.has(p.id))).map((p) => p.id);
  const order = [...kept, ...fresh];
  if (fresh.length || kept.length !== saved.length) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* quota */ }
  }
  return order.map((id) => byId.get(id));
}

export default function VocabPage() {
  const [pool, setPool] = useState(null);
  const [type, setType] = useState("all");

  useEffect(() => {
    const load = () => setPool(vocabPool());
    load();
    window.addEventListener("cgl:sync-applied", load);
    return () => window.removeEventListener("cgl:sync-applied", load);
  }, []);

  const mixed = useMemo(() => (pool ? fixedOrder(pool) : []), [pool]);

  if (!pool) return null;

  return (
    <>
      <section className="section vocab-top">
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <span className="ca-eyebrow">🔤 Vocab · {pool.length} word · Cover method</span>
          <Link href="/vocab/manage" className="btn btn--sm btn--ghost">⚙️ Import / din</Link>
        </div>
        {pool.length > 0 && (
          <div className="vl-bar">
            <div className="vl-types">
              {VL_TYPES.map((t) => {
                const n = t.k === "all" ? pool.length : pool.filter((p) => p.type === t.k).length;
                if (!n) return null;
                return <button key={t.k} type="button" className={type === t.k ? "is-on" : ""} onClick={() => setType(t.k)}>{t.l} · {n}</button>;
              })}
            </div>
          </div>
        )}
      </section>

      {!pool.length ? (
        <div className="placeholder">
          Abhi koi word nahi. <Link href="/vocab/manage" className="link">Import karo</Link>.
        </div>
      ) : (
        <VocabLayouts lay="11" pool={mixed} type={type} />
      )}
    </>
  );
}
