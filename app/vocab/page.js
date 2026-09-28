"use client";

// 🔤 Vocab — JODI MILAO (components/VocabMatch).
//
// Din wale words (OWS / Idiom / Vocab) aur khud pakde hue New Words ek saath
// (lib/vocabpool). Pehle yahan Aata/Nahi wala drill tha, phir 15 tareeke
// dropdown se compare hue; owner ne "6 · Jodi milao" final kiya, isliye na
// dropdown hai na drill. Upar type ki chhaanti (Sab / OWS / Idiom / Vocab /
// New).
//
// Purana wala page (import, din, quiz) /vocab/manage par hai.

import Link from "next/link";
import { useEffect, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import VocabMatch, { VL_TYPES } from "@/components/VocabMatch";
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
          <span className="ca-eyebrow">🔤 Vocab · {pool.length} word · Jodi milao</span>
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
        <VocabMatch pool={pool} type={type} />
      )}
    </>
  );
}
