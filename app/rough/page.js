"use client";

// ✍️ Rough pad — tablet par mock ke saath (owner: "rough work bhi record ho").
// PC par Testbook + Test Recorder (D:\over\testrec_app.py) chal raha hai; yahan
// tablet par har sawaal ka apna kaagaz: ⏭ Agla dabao → naya kaagaz, Q number +
// time. Baad mein review: har Q ka rough + liya gaya time — PC wale screenshot
// ke saath milao (Q number same rakho: dono jagah Q1 se shuru).
//
// Kaagaz lib/ink ka hi (IndexedDB + cloud), chaabi "rp:<session>.<n>"
// (lib/impnotes noteRec) — Saare IMP mein nahi aata (wo sirf pn:/fact:/vocab:).
// Session ka naam / Q ka time usi chaabi ke meta mein (setImpNoteMeta) — sync hota hai.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import { ImpNoteBox } from "@/components/ImpView";
import { openInk, viewInk, saveLocalInk, pushInk, emptyDoc } from "@/lib/ink";
import { inkSetter } from "@/lib/impink";
import { noteRec, noteKey, setImpNoteMeta, getImpNote, allImpNotes } from "@/lib/impnotes";
import { isInkWriter } from "@/lib/inkdevice";
import { setSyncPaused } from "@/lib/sync";
import "./rough.css";

const LOCAL_MS = 700;
const K = (sid, n) => noteKey("rp", `${sid}.${n}`);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Saare rough session — chaabiyon ke meta se (har device par wahi).
function sessions() {
  const all = allImpNotes();
  const m = new Map();
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith("rp:") || !v?.meta?.sid) continue;
    const s = m.get(v.meta.sid) || { sid: v.meta.sid, name: v.meta.src || v.meta.sid, started: v.meta.start || 0, qs: [] };
    s.qs.push({ k, n: v.meta.n, start: v.meta.start, end: v.meta.end, dur: v.meta.dur });
    if (v.meta.start && (!s.started || v.meta.start < s.started)) s.started = v.meta.start;
    m.set(v.meta.sid, s);
  }
  return [...m.values()].map((s) => ({ ...s, qs: s.qs.sort((a, b) => a.n - b.n) })).sort((a, b) => b.started - a.started);
}

function Index() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => {
    const on = () => setList(sessions());
    on();
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const start = () => {
    const d = new Date();
    const sid = `${d.toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
    const nm = name.trim() || `Mock ${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
    setImpNoteMeta(K(sid, 1), { title: "Q1", src: nm, book: "rough", sid, n: 1, start: Date.now() });
    router.push(`/rough?s=${sid}`);
  };
  return (
    <section className="section rg">
      <header className="rg-head">
        <div><div className="rg-eb">Tablet · mock ke saath</div><h1>✍️ Rough pad</h1>
          <p className="hint">PC par test, yahan har sawaal ka rough. ⏭ Agla = naya kaagaz. Q number PC ke Test Recorder jaisa hi rakho.</p></div>
      </header>
      <div className="rg-new">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test ka naam (jaise Mock 28 Oct Maths)" onKeyDown={(e) => e.key === "Enter" && start()} />
        <button type="button" className="btn btn--primary" onClick={start}>▶ Naya test — Q1 se</button>
      </div>
      {list.map((s) => (
        <article key={s.sid} className="rg-sess">
          <div className="rg-sess__top">
            <b>{s.name}</b>
            <span>{s.qs.length} Q · {new Date(s.started).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="rg-sess__acts">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push(`/rough?s=${s.sid}&view=1`)}>📋 Review</button>
              {isInkWriter() ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push(`/rough?s=${s.sid}`)}>✍️ Jaari</button> : null}
            </span>
          </div>
        </article>
      ))}
      {!list.length ? <p className="hint">Abhi koi session nahi.</p> : null}
    </section>
  );
}

function Review({ sid }) {
  const router = useRouter();
  const [s, setS] = useState(null);
  useEffect(() => {
    const on = () => setS(sessions().find((x) => x.sid === sid) || null);
    on();
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [sid]);
  if (!s) return <section className="section rg"><p className="hint">Session nahi mila.</p></section>;
  const tot = s.qs.reduce((a, q) => a + (q.dur || 0), 0);
  return (
    <section className="section rg">
      <header className="rg-head">
        <div><button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push("/rough")}>← Saare</button>
          <h1>📋 {s.name}</h1><p className="hint">{s.qs.length} Q · kul {fmt(tot / 1000)} · 90s+ wale laal</p></div>
      </header>
      <div className="rg-grid">
        {s.qs.map((q) => (
          <article key={q.k} className={`rg-q${(q.dur || 0) >= 90000 ? " is-long" : ""}`}>
            <div className="rg-q__top"><b>Q{q.n}</b><span>{q.dur != null ? fmt(q.dur / 1000) : "…"}</span></div>
            <ImpNoteBox k={q.k} label={`✍️ Q${q.n}`} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Pad({ sid }) {
  const router = useRouter();
  const [n, setN] = useState(() => {
    const s = sessions().find((x) => x.sid === sid);
    return s ? Math.max(...s.qs.map((q) => q.n)) : 1;
  });
  const last = (() => { const s = sessions().find((x) => x.sid === sid); return s ? Math.max(...s.qs.map((q) => q.n)) : 1; })();
  const k = K(sid, n);
  const meta = getImpNote(k)?.meta || {};
  const name = meta.src || sid;
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState("pen");
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [sec, setSec] = useState(0);
  const [state, setState] = useState("saved");
  const inkRef = useRef(null);
  const liveDoc = useRef(null);
  const localT = useRef(null);
  const writer = isInkWriter();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    setSyncPaused(true);
    return () => { document.body.style.overflow = prev; setSyncPaused(false); try { window.dispatchEvent(new CustomEvent("cgl:sync-kick")); } catch { /* SSR */ } };
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const r = noteRec(k);
      const d = writer ? (await openInk(r, { localFirst: true }).catch(() => null))?.doc : await viewInk(r).catch(() => null);
      if (!alive) return;
      liveDoc.current = d || emptyDoc(1200);
      setDoc(liveDoc.current);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [k, writer]);
  useEffect(() => {
    const t = setInterval(() => { const m = getImpNote(K(sid, last))?.meta; if (m?.start && !m.end) setSec((Date.now() - m.start) / 1000); }, 500);
    return () => clearInterval(t);
  }, [sid, last]);

  const flushLocal = useCallback(async () => {
    if (!writer || !liveDoc.current) return;
    clearTimeout(localT.current);
    try { await saveLocalInk(noteRec(k).id, liveDoc.current); setState("saved"); } catch { setState("offline"); }
  }, [k, writer]);
  const flushCloud = useCallback(async () => {
    if (!writer || !liveDoc.current) return;
    try { await pushInk(noteRec(k), liveDoc.current, inkSetter); } catch { /* baad mein */ }
  }, [k, writer]);
  const onChange = useCallback((next) => {
    if (!writer) return;
    liveDoc.current = next; setState("dirty");
    clearTimeout(localT.current);
    localT.current = setTimeout(() => flushLocal(), LOCAL_MS);
  }, [writer, flushLocal]);
  useEffect(() => () => { clearTimeout(localT.current); flushLocal(); flushCloud(); }, [flushLocal, flushCloud]);

  const goTo = async (m) => { await flushLocal(); flushCloud(); setN(m); };
  const next = async () => {
    await flushLocal(); flushCloud();
    const now = Date.now();
    const cur = getImpNote(K(sid, last))?.meta || {};
    if (cur.start && !cur.end) setImpNoteMeta(K(sid, last), { ...cur, end: now, dur: now - cur.start });
    setImpNoteMeta(K(sid, last + 1), { title: `Q${last + 1}`, src: name, book: "rough", sid, n: last + 1, start: now });
    setN(last + 1);
  };
  const end = async () => {
    await flushLocal(); flushCloud();
    const now = Date.now();
    const cur = getImpNote(K(sid, last))?.meta || {};
    if (cur.start && !cur.end) setImpNoteMeta(K(sid, last), { ...cur, end: now, dur: now - cur.start });
    try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    router.push(`/rough?s=${sid}&view=1`);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " " && e.ctrlKey) { e.preventDefault(); next(); }
      if (e.key === "PageDown") { e.preventDefault(); if (!e.repeat) setTool((t) => (t === "eraser" ? "pen" : "eraser")); }
      if (e.key === "PageUp") { e.preventDefault(); inkRef.current?.undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="inkv rg-pad">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={end} title="Test khatam — review">⏹ End</button>
        <span className="inkv__title">✍️ {name} · <b className="rg-qn">Q{n}</b>{n !== last ? <small> (purana — timer Q{last} par)</small> : null}</span>
        <span className={`rg-timer${sec >= 90 ? " is-long" : ""}`}>⏱ {fmt(sec)}</span>
        <span style={{ marginLeft: "auto" }} />
        <span className="inkv__nav">
          <button className="btn btn--ghost btn--sm" onClick={() => goTo(n - 1)} disabled={n <= 1}>‹</button>
          <button className="btn btn--ghost btn--sm" onClick={() => goTo(n + 1)} disabled={n >= last}>›</button>
          <button className="btn btn--primary rg-next" onClick={next} title="Ctrl+Space">⏭ Agla sawaal</button>
        </span>
        {writer ? <span className="inkv__pill">{state === "saved" ? "💾" : state === "dirty" ? "✍️" : "⚠️"}</span> : null}
      </div>
      <div className="inkv__body">
        <div className="inkv__ink is-imp">
          {loading ? <div className="placeholder" style={{ margin: 16 }}>Khul raha hai…</div> : (
            <InkCanvas ref={inkRef} readOnly={!writer} initialDoc={doc} tool={tool} colorIdx={colorIdx} sizeIdx={sizeIdx} onChange={onChange} />
          )}
        </div>
      </div>
      <div className="inkv__tools">
        {writer ? (
          <>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>✏️</button>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "hl"} onClick={() => setTool("hl")}>🖍️</button>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "eraser"} onClick={() => setTool((t) => (t === "eraser" ? "pen" : "eraser"))}>🧽</button>
            <span className="inkv__sep" />
            {PALETTE.map((c, i) => <button key={i} className="inkv__swatch" aria-pressed={colorIdx === i} onClick={() => { setColorIdx(i); setTool((t) => (t === "eraser" ? "pen" : t)); }} title={c.name} style={{ background: c.hex }} />)}
            <span className="inkv__sep" />
            {PEN_SIZES.map((s, i) => <button key={i} className="btn btn--ghost btn--sm" aria-pressed={sizeIdx === i} onClick={() => setSizeIdx(i)}>{["·", "•", "⬤"][i]}</button>)}
            <span className="inkv__sep" />
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.undo()}>↩</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.redo()}>↪</button>
            <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Ye kaagaz saaf?")) inkRef.current?.clear(); }}>🗑️</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.grow()}>➕ jagah</button>
          </>
        ) : <span className="inkv__ro">👁 Sirf dekhna — likhna tablet par</span>}
      </div>
    </div>
  );
}

function RoughInner() {
  const sp = useSearchParams();
  const sid = sp.get("s");
  if (!sid) return <Index />;
  if (sp.get("view")) return <Review sid={sid} />;
  return <Pad sid={sid} />;
}

export default function RoughPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><RoughInner /></Suspense>;
}
