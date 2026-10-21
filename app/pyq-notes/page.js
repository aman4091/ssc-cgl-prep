"use client";

// 📘 Notes — PYQ Notes 2025-26, GS Hot 22, Maths, English Grammar aur Vocab
// (claude.ai par bane notes, owner ne site par maange). Har book → topic →
// slides, Fact log jaisa: ek card, ‹ › / swipe / ← →. HTML public/pyq_notes
// mein hai (book/tNN.html + index.json); har <section class="chap"> har <h3>
// par kat kar slide banta hai.
//
// ⭐ IMP ✍️ — Fact log wala hi stylus page (/imp), kind "pn" — Saare IMP ke
// "📘 Notes" tab mein dikhta hai. Maths mein saath mein ✍️ Rough (owner:
// "imp ke saath normal bhi") — kind "pnr", likha hua slide ke neeche dikhta
// hai par Saare IMP mein nahi jaata. Likhna sirf tablet par (lib/inkdevice).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImpNoteBox } from "@/components/ImpView";
import { noteKey, putImpCtx, setImpNoteMeta, allImpNoteKeys } from "@/lib/impnotes";
import { isInkWriter } from "@/lib/inkdevice";
import { cutSlides, PN_BASE } from "@/lib/pyqnotes";
import "./pn.css";

// Slide ke saare ⭐ IMP — pehla (slide ki chaabi) aur stylus page ke ➕ IMP se
// bane #2, #3… (app/imp). Khaali wale ImpNoteBox khud chhupa deta hai.
function ImpSlots({ base, label }) {
  const [keys, setKeys] = useState([base]);
  useEffect(() => {
    const on = () => {
      const more = allImpNoteKeys()
        .filter((x) => x.startsWith(`${base}#`) && /^\d+$/.test(x.slice(base.length + 1)))
        .sort((a, b) => Number(a.slice(base.length + 1)) - Number(b.slice(base.length + 1)));
      setKeys([base, ...more]);
    };
    on();
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [base]);
  return keys.map((k, i) => <ImpNoteBox key={k} k={k} label={i ? `${label} ${i + 1}` : label} />);
}

const BASE = PN_BASE;
const POS = "cgl.pn.pos";
const loadPos = () => { try { return JSON.parse(localStorage.getItem(POS) || "{}") || {}; } catch { return {}; } };
const savePos = (v) => { try { localStorage.setItem(POS, JSON.stringify(v)); } catch { /* quota */ } };

function NotesInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [idx, setIdx] = useState(null);
  const [book, setBook] = useState("");
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState([]);
  const [at, setAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [writer, setWriter] = useState(false);
  const posRef = useRef({});
  const want = useRef(null);
  const loadedFor = useRef("");
  // Naya topic / book chuna → hamesha pehli slide se (owner).
  const openTopic = (bk, t) => {
    want.current = { b: bk, t, s: 0 };
    loadedFor.current = "";
    setSlides([]);
    setAt(0);
    setBook(bk);
    setTopic(t);
  };   // ?b=&t=&s= se aaye (Saare IMP ka "Notes kholo")

  useEffect(() => { setWriter(isInkWriter()); }, []);
  useEffect(() => {
    posRef.current = loadPos();
    const b = sp.get("b"), t = sp.get("t"), s = sp.get("s");
    if (b && t) want.current = { b, t, s: s == null ? null : +s };
    fetch(`${BASE}/index.json`).then((r) => r.json()).then((j) => {
      setIdx(j);
      const p = posRef.current;
      const bk = want.current?.b || p.book || j.books[0].key;
      const B = j.books.find((x) => x.key === bk) || j.books[0];
      setBook(B.key);
      setTopic(want.current?.t || p[`t:${B.key}`] || B.topics[0].id);
    }).catch(() => setIdx({ books: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const B = useMemo(() => idx?.books.find((x) => x.key === book) || null, [idx, book]);
  const T = useMemo(() => B?.topics.find((x) => x.id === topic) || null, [B, topic]);

  useEffect(() => {
    if (!B || !topic) return undefined;
    let alive = true;
    setLoading(true);
    fetch(`${BASE}/${B.key}/${topic}.html`).then((r) => r.text()).then((h) => {
      if (!alive) return;
      const ss = cutSlides(h);
      setSlides(ss);
      loadedFor.current = `${B.key}:${topic}`;
      const w = want.current;
      const saved = posRef.current[`s:${B.key}:${topic}`] || 0;
      const start = w && w.b === B.key && w.t === topic && w.s != null ? w.s : saved;
      want.current = null;
      setAt(Math.max(0, Math.min(start, ss.length - 1)));
      setLoading(false);
    }).catch(() => { if (alive) { setSlides([]); setLoading(false); } });
    return () => { alive = false; };
  }, [B, topic]);

  // Jagah yaad — book, topic aur har topic ki slide.
  useEffect(() => {
    // Sirf tab jab slides ISI topic ki hon — warna topic badalte hi purane
    // topic ki slide (jaise 6) naye topic ke naam se likh jaati thi (owner).
    if (!B || !topic || !slides.length || loadedFor.current !== `${B.key}:${topic}`) return;
    const p = posRef.current;
    p.book = B.key; p[`t:${B.key}`] = topic; p[`s:${B.key}:${topic}`] = at;
    savePos(p);
  }, [B, topic, at, slides.length]);

  const go = useCallback((d) => {
    setAt((a) => {
      const n = a + d;
      return n < 0 || n >= slides.length ? a : n;
    });
  }, [slides.length]);
  useEffect(() => {
    const k = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);
  const card = useRef(null);
  useEffect(() => {
    const r = card.current?.getBoundingClientRect();
    if (r && r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 70 });
  }, [at]);
  // Screen touch se aage / peeche (owner) — ungli YA stylus, dono: pointer
  // events (stylus touch event deta hi nahi, isliye pehle wala swipe pen se
  // nahi chalta tha).
  //   • swipe: baayen kheencho → agli, daayen → pichhli
  //   • tap: card ka daayan tihaai → agli, baayan tihaai → pichhli
  // Button / link / table / diagram / quiz par tap ho to apna kaam karne do.
  const touch = useRef(null);
  const SKIP = "a, button, summary, details, select, input, .tbl, .sv, .imp-box";
  const onPd = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    touch.current = e.target.closest(SKIP) ? null : { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPu = (e) => {
    const t0 = touch.current; touch.current = null;
    if (!t0) return;
    const dx = e.clientX - t0.x, dy = e.clientY - t0.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(dx < 0 ? 1 : -1); return; }
    // Chhota sa tap (hila nahi, jaldi chhoda, kuch select nahi kiya).
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10 || Date.now() - t0.t > 450) return;
    if (String(window.getSelection?.() || "").trim()) return;
    const r = card.current?.getBoundingClientRect();
    if (!r) return;
    const f = (e.clientX - r.left) / r.width;
    if (f > 0.67) go(1);
    else if (f < 0.33) go(-1);
  };

  const cur = slides[at];
  const chapters = useMemo(() => {
    const seen = new Set();
    return slides.map((s, i) => ({ s, i })).filter(({ s }) => (seen.has(s.chap) ? false : (seen.add(s.chap), true)));
  }, [slides]);
  const chapAt = chapters.reduce((a, c) => (c.i <= at ? c.i : a), 0);

  const openNote = (kind) => {
    if (!cur || !B || !T) return;
    const nk = noteKey(kind, `${B.key}.${cur.key}`);
    putImpCtx(nk, { title: cur.title, points: cur.points });
    {
      setImpNoteMeta(nk, {
        title: cur.title, src: `${B.name} · ${T.name}`, book: B.key, bookName: `${B.icon} ${B.name}`,
        href: `/pyq-notes?b=${B.key}&t=${T.id}&s=${at}`,
      });
    }
    // ‹ › stylus page par — poore topic ki slides (sessionStorage).
    try {
      sessionStorage.setItem("imp.list", JSON.stringify({
        kind, items: slides.map((x) => ({ k: noteKey(kind, `${B.key}.${x.key}`), title: x.title, points: x.points })),
      }));
    } catch { /* bahut badi list — tab bas ek slide */ }
    router.push(`/imp?k=${encodeURIComponent(nk)}&back=${encodeURIComponent(`/pyq-notes?b=${B.key}&t=${T.id}&s=${at}`)}`);
  };

  if (!idx) return <div className="placeholder">Loading…</div>;
  return (
    <section className="section pn">
      <header className="pn-head">
        <h1>📘 Notes</h1>
        <div className="pn-books" role="tablist">
          {idx.books.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={x.key === book}
              onClick={() => openTopic(x.key, posRef.current[`t:${x.key}`] || x.topics[0].id)}>
              {x.icon} {x.name}
            </button>
          ))}
        </div>
        {B ? (
          <div className="pn-sel">
            <label>Topic
              <select value={topic} onChange={(e) => openTopic(B.key, e.target.value)}>
                {B.topics.map((x, i) => <option key={x.id} value={x.id}>{i + 1}. {x.name}</option>)}
              </select>
            </label>
            <label>Chapter
              <select value={chapAt} onChange={(e) => setAt(+e.target.value)}>
                {chapters.map(({ s, i }) => <option key={i} value={i}>{s.chap}</option>)}
              </select>
            </label>
          </div>
        ) : null}
        <div className="pn-legend">
          <span><span className="tag p">PYQ</span> exam mein aaya</span>
          <span><span className="tag x">CGL+</span> juda fact</span>
          <span><mark>highlight</mark> = answer</span>
        </div>
      </header>
      <div className="pn-prog"><i style={{ width: slides.length ? `${((at + 1) / slides.length) * 100}%` : 0 }} /></div>
      {loading ? <p className="hint">Notes khul rahe hain…</p> : null}
      {!loading && cur ? (
        <article ref={card} className={`pn-card ${cur.c}`} onPointerDown={onPd} onPointerUp={onPu} onPointerCancel={() => { touch.current = null; }}>
          <div className="pn-top">
            <b>{cur.chap}</b>
            <span>{at + 1} / {slides.length}</span>
          </div>
          <h2 className="pn-title">{cur.title}</h2>
          {writer ? (
            <div className="pn-acts">
              <button type="button" className="btn btn--sm pn-imp" onClick={() => openNote("pn")} title="Stylus se IMP likho">⭐ IMP ✍️</button>
              {B?.rough ? <button type="button" className="btn btn--sm btn--ghost" onClick={() => openNote("pnr")} title="Stylus se rough / hal likho">✍️ Rough</button> : null}
            </div>
          ) : null}
          <div className="pn-body" dangerouslySetInnerHTML={{ __html: cur.body }} />
          <ImpSlots base={noteKey("pn", `${B.key}.${cur.key}`)} label="⭐ IMP" />
          {B?.rough ? <ImpNoteBox k={noteKey("pnr", `${B.key}.${cur.key}`)} label="✍️ Rough" /> : null}
        </article>
      ) : null}
      {!loading && !cur ? <p className="hint">Is topic mein abhi koi slide nahi.</p> : null}
      <div className="pn-nav">
        <button type="button" className="pn-go" onClick={() => go(-1)} disabled={at <= 0} aria-label="Pichhli slide">‹</button>
        <span>{slides.length ? `${at + 1} / ${slides.length}` : ""}</span>
        <button type="button" className="pn-go" onClick={() => go(1)} disabled={at >= slides.length - 1} aria-label="Agli slide">›</button>
      </div>
      <p className="hint pn-hint">Card ke daayen hisse par tap / baayen kheencho → agli · baayen hisse par tap / daayen kheencho → pichhli · ← → keys</p>
    </section>
  );
}

export default function PyqNotesPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><NotesInner /></Suspense>;
}
