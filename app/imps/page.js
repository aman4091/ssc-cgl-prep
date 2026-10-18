"use client";

// ⭐ Saare IMP — ek jagah (owner): Fact log, Vocab, Answers, PYQ (+ PDFs ka
// apna page). Tablet par stylus se likhe IMP yahan sirf DEKHNE ko, har device
// par. Har IMP tabhi khulta hai jab screen ke paas aaye (lambi list halki rahe).

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Markdown from "@/components/Markdown";
import ImpView, { ImpNoteBox } from "@/components/ImpView";
import { allImpNotes } from "@/lib/impnotes";
import { localInkCounts } from "@/lib/ink";
import { getFacts } from "@/lib/missionfacts";
import { factSecs } from "@/lib/factslides";
import { vocabPool } from "@/lib/vocabpool";
import { getWrongBook, imagesOf } from "@/lib/wrongbook";
import { useImageUrls } from "@/lib/wrongimages";
import "../pdfs/pdfs.css";

const TABS = [
  { k: "fact", label: "🧠 Fact log" },
  { k: "vocab", label: "🔤 Vocab" },
  { k: "ans", label: "📖 Answers" },
  { k: "pyq", label: "📚 PYQ" },
];

// Screen ke paas aaye tabhi andar wala bane.
function Lazy({ children, h = 140 }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return <div ref={ref} style={on ? undefined : { minHeight: h }}>{on ? children : null}</div>;
}

// Is pate ka IMP hai? (cloud par pata, ya is device par likha)
const hasNote = (notes, local, k) => {
  const v = notes[k];
  return !!((v && (v.impUrl || v.impStrokes)) || local[`imp:${k}`] > 0);
};

function AnsQ({ r }) {
  const { urls } = useImageUrls(imagesOf(r));
  return (
    <>
      {r.q?.question ? <div className="imps-q"><Markdown>{r.q.question}</Markdown></div> : null}
      {urls.slice(0, 1).map((u) => <img key={u} src={u} alt="" className="imps-img" />)}
    </>
  );
}

function ImpsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = TABS.some((t) => t.k === sp.get("t")) ? sp.get("t") : "fact";
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((x) => x + 1);
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const data = useMemo(() => {
    if (!ready) return { fact: [], vocab: [], ans: [], pyq: [] };
    const notes = allImpNotes();
    const local = localInkCounts();
    const fact = factSecs(getFacts()).filter((s) => hasNote(notes, local, `fact:${s.key}`));
    const vocab = vocabPool().filter((w) => hasNote(notes, local, `vocab:${w.id}`));
    const ans = getWrongBook().filter((r) => r.impUrl || r.impStrokes || local[`${r.id}~imp`] > 0);
    const pyq = Object.entries(notes)
      .filter(([k, v]) => k.startsWith("pyq:") && v && (v.impUrl || v.impStrokes))
      .map(([k, v]) => ({ k, ...v }))
      .concat(Object.keys(local).filter((id) => id.startsWith("imp:pyq:") && local[id] > 0 && !notes[id.slice(4)]?.impUrl)
        .map((id) => ({ k: id.slice(4), ...(notes[id.slice(4)] || {}) })))
      .sort((a, b) => String(b.impAt || "").localeCompare(String(a.impAt || "")));
    return { fact, vocab, ans, pyq };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick]);

  const list = data[tab] || [];
  return (
    <section className="section pdfs">
      <header className="pdfs-head">
        <div>
          <h1>⭐ Saare IMP</h1>
          <p className="hint">Tablet par stylus se likhe IMP — yahan sab ek jagah.</p>
        </div>
        <div className="pdfs-acts"><Link href="/pdfs/imp" className="btn btn--ghost btn--sm">📄 PDFs ke IMP</Link></div>
      </header>
      <div className="imps-tabs">
        {TABS.map((t) => (
          <button key={t.k} type="button" className={`imps-tab${t.k === tab ? " is-on" : ""}`} onClick={() => router.replace(`/imps?t=${t.k}`)}>
            {t.label} <small>{(data[t.k] || []).length}</small>
          </button>
        ))}
      </div>
      {ready && !list.length ? <p className="hint">Abhi yahan koi IMP nahi — tablet par ⭐ IMP likho.</p> : null}
      <div className="pdfs-impgrid">
        {tab === "fact" && list.map((s) => (
          // Fact log / Vocab: sirf IMP (owner) — fact / word ka text nahi.
          <article key={s.key} className="imps-card imps-card--only">
            <Lazy><ImpNoteBox k={`fact:${s.key}`} /></Lazy>
          </article>
        ))}
        {tab === "vocab" && list.map((w) => (
          <article key={w.id} className="imps-card imps-card--only">
            <Lazy><ImpNoteBox k={`vocab:${w.id}`} /></Lazy>
          </article>
        ))}
        {tab === "ans" && list.map((r) => (
          <article key={r.id} className="imps-card">
            <Lazy h={200}><AnsQ r={r} /><ImpView rec={r} /></Lazy>
          </article>
        ))}
        {tab === "pyq" && list.map((x) => (
          <article key={x.k} className="imps-card">
            {x.meta?.src ? <span className="imps-sub">{x.meta.src}</span> : null}
            {x.meta?.img ? <img src={x.meta.img} alt="" className="imps-img" /> : x.meta?.title ? <div className="imps-q"><Markdown>{x.meta.title}</Markdown></div> : null}
            <Lazy><ImpNoteBox k={x.k} /></Lazy>
            {x.meta?.href ? <Link href={x.meta.href} className="pdfs-imp__p">PYQ kholo ›</Link> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ImpsPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><ImpsInner /></Suspense>;
}
