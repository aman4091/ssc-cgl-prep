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
import { useEffect, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import VocabLayouts, { VL_TYPES } from "@/components/VocabLayouts";
import "./layouts15.css";
import "./layouts.css";

export default function VocabPage() {
  const [pool, setPool] = useState(null);
  const [type, setType] = useState("all");

  useEffect(() => {
    const load = () => setPool(vocabPool());
    load();
    window.addEventListener("cgl:sync-applied", load);
    return () => window.removeEventListener("cgl:sync-applied", load);
  }, []);

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
        <VocabLayouts lay="11" pool={pool} type={type} />
      )}
    </>
  );
}
