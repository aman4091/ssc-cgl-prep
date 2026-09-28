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
import { counts, GOAL } from "@/lib/vocabscore";
import "./layouts.css";

export default function VocabPage() {
  const [pool, setPool] = useState(null);
  const [type, setType] = useState("all");
  // Kitne word ki chaar baar ho chuki — patti par dikhta hai aur "✅ 4 ho gaye"
  // khaane ki ginti bhi yahi hai.
  const [tally, setTally] = useState({ done: 0, learning: 0, setNo: 0 });

  useEffect(() => {
    const load = () => setPool(vocabPool());
    load();
    window.addEventListener("cgl:sync-applied", load);
    return () => window.removeEventListener("cgl:sync-applied", load);
  }, []);

  useEffect(() => {
    if (!pool) return undefined;
    const on = () => setTally(counts(pool));
    on();
    window.addEventListener("cgl:vocab-match", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:vocab-match", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, [pool]);

  if (!pool) return null;

  return (
    <>
      <section className="section vocab-top">
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <span className="ca-eyebrow">
            🔤 Vocab · {pool.length} word · Jodi milao
            {tally.done ? <> · ✅ {tally.done} pakke</> : null}
          </span>
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
              {/* ✅ Apna khaana: jo word {GOAL} baar sahi ho chuke. Yahan bhi
                  wahi jodi milao chalta hai — kabhi-kabhi dobara aake pakka
                  karne ke liye. */}
              <button
                type="button"
                className={`vl-done${type === "done4" ? " is-on" : ""}`}
                onClick={() => setType("done4")}
              >✅ {GOAL} ho gaye · {tally.done}</button>
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
