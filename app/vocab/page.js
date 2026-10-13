"use client";

// 🔤 Vocab — COVER METHOD (components/VocabLayouts, roop "11"): word aur
// matlab ki table, ek column dhaka; row dabao to khule.
//
// Din wale words (OWS / Idiom / Vocab) aur khud pakde hue New Words ek saath
// (lib/vocabpool). Upar type ki chhaanti (OWS / Idiom / Vocab / New — "Sab" hataya).
// Owner ne 15 tareekon mein se Cover method final kiya — baaki tareeke aur
// pehle wala Jodi milao (components/VocabMatch) backup mein hain (backup/README.md).
//
// Purana wala page (import, din, quiz) /vocab/manage par hai.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import { SlideRow } from "@/components/OneLinerLayouts";
import { getHindiMap, hindiOf, getEnMap, enOf, ensureHindi } from "@/lib/vocabhindi";
import "./layouts15.css";
import "./layouts.css";
import "@/app/notes/paste/layouts.css";

// 🎞️ FINAL (owner): Fact log jaisi SLIDES — OWS / Idiom / Vocab / New sab
// mila-jula, RANDOM kram (ek baar bana, phir pakka; jahan chhoda wahin se). Ek slide = ek word: matlab +
// (jhanda nahi — Windows par 🇮🇳 "IN" dikhta tha)
// Hindi (DeepSeek, peechhe — lib/vocabhindi; New ka chhota English bhi).
// Cover method (VocabLayouts "11") code mein pada hai.
const TYPE_LABEL = { ows: "🔤 OWS", idiom: "💬 Idiom", vocab: "📖 Vocab", new: "📋 New" };
const plainLine = (s) => String(s || "").replace(/\*\*|__|`/g, "").split("\n").map((x) => x.trim()).find(Boolean) || "";
function shuffled(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// Random kram EK BAAR ban kar pakka (owner: "har refresh par naye nahi —
// number same, fix"). Naye word aakhir mein (unka apna random), hate hue
// nikal jaate hain. Kahan tak pahunche — cgl.vocab.slideat, wahin se shuru.
const SORDER = "cgl.vocab.slideorder";
const SAT = "cgl.vocab.slideat";
function slideOrder(pool) {
  let saved = [];
  try { const v = JSON.parse(localStorage.getItem(SORDER) || "[]"); if (Array.isArray(v)) saved = v; } catch { /* ignore */ }
  const byId = new Map(pool.map((p) => [p.id, p]));
  const kept = saved.filter((id) => byId.has(id));
  const seen = new Set(kept);
  const fresh = shuffled(pool.filter((p) => !seen.has(p.id)).map((p) => p.id));
  const order = [...kept, ...fresh];
  if (fresh.length || kept.length !== saved.length) {
    try { localStorage.setItem(SORDER, JSON.stringify(order)); } catch { /* quota */ }
  }
  return order.map((id) => byId.get(id));
}
const readAt = () => { try { return Math.max(0, Number(localStorage.getItem(SAT)) || 0); } catch { return 0; } };

function VocabSlides({ pool }) {
  const list = useMemo(() => slideOrder(pool), [pool]);
  const [start] = useState(readAt);
  const [hi, setHi] = useState(() => getHindiMap());
  const [en, setEn] = useState(() => getEnMap());
  useEffect(() => {
    const on = () => { setHi(getHindiMap()); setEn(getEnMap()); };
    window.addEventListener("cgl:vocab-hindi", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:vocab-hindi", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  // Saamne wali slide se aage ke 20 tak ka Hindi (aur New ka English). Aage
  // badhte ho to bas naya EK judta hai — jo ban chuke wo dobara nahi maangte.
  const onAt = useCallback((at) => {
    try { localStorage.setItem(SAT, String(at)); } catch { /* ignore */ }
    ensureHindi(list.slice(at, at + 21).map((p) => ({ word: p.word, def: p.def || p.meaning || "", en: p.type === "new" })));
  }, [list]);
  const secs = list.map((p) => {
    const mean = p.type === "new" ? (enOf(en, p.word) || plainLine(p.mine || p.meaning)) : plainLine(p.def || p.meaning);
    const h = hindiOf(hi, p.word);
    return {
      key: p.id, kind: "topic", title: p.word,
      points: [{ text: mean || "⏳", star: false }, { text: h || "⏳", star: false }],
      meta: TYPE_LABEL[p.type] || "",
    };
  });
  return <SlideRow secs={secs} onAt={onAt} start={start} empty="Abhi koi word nahi." />;
}

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
          <span className="ca-eyebrow">🔤 Vocab · {pool.length} word · Slides (random)</span>
          <Link href="/vocab/manage" className="btn btn--sm btn--ghost">⚙️ Import / din</Link>
        </div>
      </section>

      {!pool.length ? (
        <div className="placeholder">
          Abhi koi word nahi. <Link href="/vocab/manage" className="link">Import karo</Link>.
        </div>
      ) : (
        <VocabSlides pool={pool} />
      )}
    </>
  );
}
