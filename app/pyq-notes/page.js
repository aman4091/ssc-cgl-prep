"use client";

// 📘 Notes — PYQ Notes 2025-26, GS Hot 22, Maths, English Grammar aur Vocab
// (claude.ai par bane notes). Desktop wale "SSC Notes" jaisa hi roop (owner:
// "same as it is, slide hata de"): baayen topic ki list (phone par drawer),
// ek baar mein ek topic poora — upar chapter ke chips, neeche ‹ › pager.
// HTML public/pyq_notes mein hai (book/tNN.html + index.json).
//
// ⭐ IMP ✍️ — har <h3> hisse ke saath (chaabi wahi jo pehle slide ki thi,
// lib/pyqnotes cutSlides — purane IMP apni jagah). Stylus page /imp, kind "pn",
// Saare IMP ke "📘 Notes" tab mein. Maths mein saath mein ✍️ Rough (kind
// "pnr") — usi hisse ke neeche, Saare IMP mein nahi. Likhna sirf tablet par.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImpNoteBox } from "@/components/ImpView";
import { noteKey, putImpCtx, setImpNoteMeta, allImpNoteKeys } from "@/lib/impnotes";
import { isInkWriter } from "@/lib/inkdevice";
import { cutSlides, PN_BASE } from "@/lib/pyqnotes";
import { mountStudy } from "@/lib/studyaddon";
import "./pn.css";
import "./notes-lib.css";

// Hisse ke saare ⭐ IMP — pehla (hisse ki chaabi) aur stylus page ke ➕ IMP se
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

// 🃏 Notes / Flashcards / Quiz — neeche beech mein dock (desktop notes jaisa).
// Book ke saare topic pehli baar Flashcards / Quiz dabane par hi aate hain.
function StudyDock({ B }) {
  const dock = useRef(null), panel = useRef(null), inner = useRef(null);
  const stop = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { stop.current?.stop(); stop.current = null; }, [B]);
  // ⛶ Poori screen (owner) — Flashcards / Quiz bina site ke menu ke.
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    on();
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFs = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else document.documentElement.requestFullscreen?.().catch(() => {});
    } catch { /* ignore */ }
  };
  const start = async (e) => {
    const m = e.target.closest("button[data-m]")?.dataset.m;
    if (!m || m === "notes" || stop.current || busy) return;
    setBusy(true);
    const sources = (await Promise.all(B.topics.map((t) => fetch(`${BASE}/${B.key}/${t.id}.html`)
      .then((r) => (r.ok ? r.text() : "")).then((html) => ({ g: t.name, html })).catch(() => ({ g: t.name, html: "" }))))).filter((x) => x.html);
    setBusy(false);
    stop.current = mountStudy({ dock: dock.current, panel: panel.current, inner: inner.current }, sources, B.key);
    stop.current.open(m);
  };
  return (
    <>
      <div className="nst-dock" ref={dock} role="group" aria-label="Padhne ka tarika" onClick={start}>
        <button type="button" data-m="notes" aria-pressed="true">Notes</button>
        <button type="button" data-m="cards" aria-pressed="false" disabled={busy}>{busy ? "…" : "Flashcards"}</button>
        <button type="button" data-m="quiz" aria-pressed="false" disabled={busy}>Quiz</button>
        <button type="button" className="nst-fs" onClick={toggleFs} aria-pressed={fs} title={fs ? "Poori screen band" : "Poori screen"} aria-label={fs ? "Poori screen band" : "Poori screen"}>{fs ? "⤡" : "⛶"}</button>
      </div>
      <div className="nst-panel" ref={panel} hidden><div className="nst-in" ref={inner} /></div>
    </>
  );
}

const BASE = PN_BASE;
const POS = "cgl.pn.pos";
const loadPos = () => { try { return JSON.parse(localStorage.getItem(POS) || "{}") || {}; } catch { return {}; } };
const savePos = (v) => { try { localStorage.setItem(POS, JSON.stringify(v)); } catch { /* quota */ } };
const blockId = (key) => `pn-${key.replace(/\./g, "-")}`;

function NotesInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [idx, setIdx] = useState(null);
  const [book, setBook] = useState("");
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [writer, setWriter] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const posRef = useRef({});
  // ?b=&t=&s= (Saare IMP / stylus page se wapas) — us hisse tak scroll.
  const want = useRef(null);

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
  const ti = B ? B.topics.findIndex((x) => x.id === topic) : -1;
  const T = ti >= 0 ? B.topics[ti] : null;

  const openTopic = (bk, t) => {
    want.current = null;
    setBook(bk);
    setTopic(t);
    setOpen(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (!B || !topic) return undefined;
    let alive = true;
    setLoading(true);
    fetch(`${BASE}/${B.key}/${topic}.html`).then((r) => r.text()).then((h) => {
      if (!alive) return;
      const ss = cutSlides(h);
      setSlides(ss);
      setLoading(false);
      const p = posRef.current;
      p.book = B.key; p[`t:${B.key}`] = topic;
      savePos(p);
      const w = want.current;
      want.current = null;
      if (w && w.b === B.key && w.t === topic && w.s != null && ss[w.s]) {
        setTimeout(() => document.getElementById(blockId(ss[w.s].key))?.scrollIntoView({ block: "start" }), 60);
      }
    }).catch(() => { if (alive) { setSlides([]); setLoading(false); } });
    return () => { alive = false; };
  }, [B, topic]);

  // Topic ke chapter (section) — har ek ke hisse saath mein.
  const secs = useMemo(() => {
    const out = [];
    slides.forEach((s, i) => {
      const last = out[out.length - 1];
      if (last && last.id === s.sec) last.items.push({ s, i });
      else out.push({ id: s.sec, chap: s.chap, h2: s.h2, c: s.c, items: [{ s, i }] });
    });
    return out;
  }, [slides]);

  const openNote = (kind, s, i) => {
    if (!B || !T) return;
    const nk = noteKey(kind, `${B.key}.${s.key}`);
    const href = `/pyq-notes?b=${B.key}&t=${T.id}&s=${i}`;
    putImpCtx(nk, { title: s.title, points: s.points });
    setImpNoteMeta(nk, { title: s.title, src: `${B.name} · ${T.name}`, book: B.key, bookName: `${B.icon} ${B.name}`, href });
    // ‹ › stylus page par — poore topic ke hisse (sessionStorage).
    try {
      sessionStorage.setItem("imp.list", JSON.stringify({
        kind, book: B.key, bookName: `${B.icon} ${B.name}`, src: `${B.name} · ${T.name}`, t: T.id,
        items: slides.map((x, j) => ({ k: noteKey(kind, `${B.key}.${x.key}`), title: x.title, points: x.points, s: j })),
      }));
    } catch { /* bahut badi list — tab bas ek hissa */ }
    router.push(`/imp?k=${encodeURIComponent(nk)}&back=${encodeURIComponent(href)}`);
  };

  if (!idx) return <div className="placeholder">Loading…</div>;
  const ql = q.trim().toLowerCase();
  const prevT = B && ti > 0 ? B.topics[ti - 1] : null;
  const nextT = B && ti >= 0 && ti < B.topics.length - 1 ? B.topics[ti + 1] : null;
  return (
    <div className="ntl-wrap">
    <div className={`ntl${open ? " open" : ""}`}>
      <aside className="ntl-side" aria-label="Topics">
        <div className="ntl-brand">
          <div className="eb">SSC Notes</div>
          <h1>{B ? `${B.icon} ${B.name}` : "📘 Notes"}</h1>
          <div className="ntl-books">
            {idx.books.map((x) => (
              <button key={x.key} type="button" aria-pressed={x.key === book} title={x.name}
                onClick={() => openTopic(x.key, posRef.current[`t:${x.key}`] || x.topics[0].id)}>
                {x.icon} {x.name.replace(/ Notes.*$/, "")}
              </button>
            ))}
          </div>
        </div>
        <div className="ntl-find">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input type="search" placeholder="Topic dhoondo" aria-label="Topic dhoondo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="ntl-list">
          {(B?.topics || []).map((x, i) => (ql && !x.name.toLowerCase().includes(ql) ? null : (
            <li key={x.id}>
              <button type="button" aria-current={x.id === topic} onClick={() => openTopic(B.key, x.id)}>
                <span className="no">{i + 1}</span><span className="nm">{x.name}</span>
              </button>
            </li>
          )))}
        </ul>
        <div className="ntl-legend">
          <span><span className="tag p">PYQ</span>exam mein aaya</span>
          <span><span className="tag x">CGL+</span>juda fact</span>
          <span><mark>highlight</mark>&nbsp; answer</span>
        </div>
      </aside>
      <div className="ntl-scrim" onClick={() => setOpen(false)} />
      <main className="ntl-main">
        <div className="ntl-col">
          <div className="ntl-top">
            <button className="ntl-menu" type="button" aria-label="Topics kholo" onClick={() => setOpen(true)}>
              <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className="ntl-crumb"><small>{T ? `Topic ${ti + 1} of ${B.topics.length}` : ""}</small><span>{T?.name || ""}</span></div>
            <div className="ntl-step">
              <button type="button" aria-label="Pichhla topic" disabled={!prevT} onClick={() => prevT && openTopic(B.key, prevT.id)}>‹</button>
              <button type="button" aria-label="Agla topic" disabled={!nextT} onClick={() => nextT && openTopic(B.key, nextT.id)}>›</button>
            </div>
          </div>
          <div className="ntl-head">
            <div className="k">{T ? `Topic ${ti + 1}` : ""}</div>
            <h2>{T?.name || ""}</h2>
            {secs.length > 1 ? (
              <nav className="ntl-chips">
                {secs.map((x) => <a key={x.id} href={`#${x.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(x.id)?.scrollIntoView({ behavior: "smooth" }); }}>{x.chap}</a>)}
              </nav>
            ) : null}
          </div>
          {loading ? <p className="hint">Notes khul rahe hain…</p> : null}
          <div className="ntl-view">
            {!loading && secs.map((x) => (
              <section key={x.id} id={x.id} className={`chap ${x.c}`}>
                <div dangerouslySetInnerHTML={{ __html: x.h2 }} />
                {x.items.map(({ s, i }) => {
                  const acts = writer ? (
                    <span className="ntl-acts">
                      <button type="button" className="ntl-imp" onClick={() => openNote("pn", s, i)} title="Stylus se IMP likho">⭐ IMP ✍️</button>
                      {B?.rough ? <button type="button" className="ntl-rough" onClick={() => openNote("pnr", s, i)} title="Stylus se rough / hal likho">✍️ Rough</button> : null}
                    </span>
                  ) : null;
                  return (
                    <div key={s.key} id={blockId(s.key)} className="ntl-blk">
                      {s.pre ? <div dangerouslySetInnerHTML={{ __html: s.pre }} /> : null}
                      {s.h3 ? (
                        <div className="ntl-h3"><div dangerouslySetInnerHTML={{ __html: s.h3 }} />{acts}</div>
                      ) : acts ? <div className="ntl-h3 ntl-h3--bare">{acts}</div> : null}
                      <div dangerouslySetInnerHTML={{ __html: s.rest }} />
                      <ImpSlots base={noteKey("pn", `${B.key}.${s.key}`)} label="⭐ IMP" />
                      {/* ✍️ Rough sirf tablet (likhne wale device) par — desktop / phone par nahi (owner). */}
                      {B?.rough && writer ? <ImpNoteBox k={noteKey("pnr", `${B.key}.${s.key}`)} label="✍️ Rough" /> : null}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
          <div className="ntl-pager">
            {prevT ? <button type="button" onClick={() => openTopic(B.key, prevT.id)}><small>Pichhla</small><b>{prevT.name}</b></button> : <span />}
            {nextT ? <button type="button" onClick={() => openTopic(B.key, nextT.id)}><small>Agla</small><b>{nextT.name}</b></button> : null}
          </div>
        </div>
      </main>
      {B ? <StudyDock key={B.key} B={B} /> : null}
    </div>
    </div>
  );
}

export default function PyqNotesPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><NotesInner /></Suspense>;
}
