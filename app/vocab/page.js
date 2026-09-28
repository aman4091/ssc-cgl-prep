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
//
// 🎨 Upar dropdown se yaad karne ke 4 aur tareeke (components/VocabLayouts)
// — 15 mein se owner ne MCQ, Jodi milao, Memory tiles, Cover method rakhe.
// "0" = yahi purana drill. Chunaav is device
// par `cgl.vocablayout` mein; type ki chhaanti (OWS / Idiom / Vocab / New)
// naye tareekon ke liye.

import Link from "next/link";
import { useEffect, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import PyqDrill from "@/components/PyqDrill";
import VocabCard from "@/components/VocabCard";
import VocabLayouts, { VL_LAYOUTS, VL_TYPES } from "@/components/VocabLayouts";
import "./layouts.css";

const LAY_KEY = "cgl.vocablayout";

export default function VocabPage() {
  const [pool, setPool] = useState(null);
  const [lay, setLay] = useState("0");
  const [type, setType] = useState("all");
  useEffect(() => { try { const v = localStorage.getItem(LAY_KEY); if (v && VL_LAYOUTS.some((l) => l.id === v)) setLay(v); } catch { /* private */ } }, []);
  const pickLay = (v) => { setLay(v); try { localStorage.setItem(LAY_KEY, v); } catch { /* private */ } };

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
          <span className="ca-eyebrow">🔤 Vocab · {pool.length} word · OWS + Idiom + Vocab</span>
          <Link href="/vocab/manage" className="btn btn--sm btn--ghost">⚙️ Import / din</Link>
        </div>
        <div className="vl-bar">
          <label className="vl-pick">
            <select value={lay} onChange={(e) => pickLay(e.target.value)} aria-label="Yaad karne ka tareeka">
              <option value="0">🎨 0 · Purana drill (Aata / Nahi)</option>
              {VL_LAYOUTS.map((l) => <option key={l.id} value={l.id}>🎨 {l.id} · {l.name}</option>)}
            </select>
          </label>
          {lay !== "0" && (
            <div className="vl-types">
              {VL_TYPES.map((t) => {
                const n = t.k === "all" ? pool.length : pool.filter((p) => p.type === t.k).length;
                if (!n) return null;
                return <button key={t.k} type="button" className={type === t.k ? "is-on" : ""} onClick={() => setType(t.k)}>{t.l} · {n}</button>;
              })}
            </div>
          )}
        </div>
      </section>

      {!pool.length ? (
        <div className="placeholder">
          Abhi koi word nahi. <Link href="/vocab/manage" className="link">Import karo</Link>.
        </div>
      ) : lay !== "0" ? (
        <VocabLayouts lay={lay} pool={pool} type={type} />
      ) : (
        <PyqDrill
            timer={0}   /* yahan ghadi nahi — ye padhne ki jagah hai, exam ki nahi */
          title="Vocab"
          list={pool}
          resumeKey="vocab:all"
          unit="Word"
          shuffleFirst
          renderCard={(item) => <VocabCard key={item.id} item={item} onDelete={() => setPool(vocabPool())} />}
        />
      )}
    </>
  );
}
