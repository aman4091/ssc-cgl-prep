"use client";

// 🔤 Vocab — ab ek hi thaili aur fact log jaisa revision.
//
// Din wale words (OWS / Idiom / Vocab) aur khud pakde hue New Words ek saath
// (lib/vocabpool), kram RANDOM, aur wahi do button jo baaki sab jagah hain:
//
//   Aata hai      -> ye word 100 word aage chala jata hai
//   Nahi aata hai -> 3re, phir 4the, phir 5ve … (jab tak "Aata hai" na lage)
//
// Ginti aur kram `cgl.pyqdrill` mein "vocab:all" ke naam se bachte hain,
// isliye band karke kholne par wahi se chalta hai.
//
// Purana wala page (import, din, quiz) /vocab/manage par hai.

import Link from "next/link";
import { useEffect, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import PyqDrill from "@/components/PyqDrill";
import VocabCard from "@/components/VocabCard";

export default function VocabPage() {
  const [pool, setPool] = useState(null);

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
          <span className="ca-eyebrow">🔤 Vocab · {pool.length} word</span>
          <Link href="/vocab/manage" className="btn btn--sm btn--ghost">⚙️ Import / din</Link>
        </div>
      </section>

      {!pool.length ? (
        <div className="placeholder">
          Abhi koi word nahi. <Link href="/vocab/manage" className="link">Import karo</Link>.
        </div>
      ) : (
        <PyqDrill
          title="Vocab"
          list={pool}
          resumeKey="vocab:all"
          unit="Word"
          shuffleFirst
          renderCard={(item) => <VocabCard key={item.id} item={item} />}
        />
      )}
    </>
  );
}
